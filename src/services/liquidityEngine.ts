import { Candle, OrderBookState, RawTrade } from '../types/market';
import {
  LiquidityPool,
  RangeMeasurementResult,
  RestingLimitWall,
  SweptOrderEvent,
} from '../types/liquidity';

export class LiquidityEngine {
  private currentBook: OrderBookState | null = null;
  private currentCandles: Candle[] = [];
  private currentPrice: number = 0;
  private tickSize: number = 0.50;

  // Resting limit walls
  private limitWalls: RestingLimitWall[] = [];

  // Liquidity pools (BSL / SSL / TP)
  private liquidityPools: LiquidityPool[] = [];

  // Swept order events ("ออเดอร์ที่ถูกเก็บไปแล้ว")
  private sweptEvents: SweptOrderEvent[] = [];
  private maxSweptEvents: number = 100;

  // Active level tracking for sweep detection
  // priceBucket -> { firstSeenTime, lastTime, totalVolume, buyVol, sellVol, initialWallVol, side }
  private activeSweepTracking: Map<
    number,
    {
      startTime: number;
      lastTime: number;
      volume: number;
      buyVolume: number;
      sellVolume: number;
      startPrice: number;
      highPrice: number;
      lowPrice: number;
      poolId?: string;
      isRecorded: boolean;
    }
  > = new Map();

  // Price history map for range inspection
  private tradeHistory: RawTrade[] = [];

  constructor(tickSize: number = 0.50) {
    this.tickSize = tickSize;
  }

  public setTickSize(tick: number) {
    this.tickSize = Math.max(0.01, tick);
  }

  public roundPrice(p: number): number {
    return Math.round(p / this.tickSize) * this.tickSize;
  }

  public getLimitWalls(): RestingLimitWall[] {
    return this.limitWalls;
  }

  public getLiquidityPools(): LiquidityPool[] {
    return this.liquidityPools;
  }

  public getSweptEvents(): SweptOrderEvent[] {
    return this.sweptEvents;
  }

  public getCandles(): Candle[] {
    return this.currentCandles;
  }

  // Update order book & recalculate resting limit walls
  public processOrderBook(book: OrderBookState, currentPrice?: number) {
    this.currentBook = book;
    if (currentPrice && currentPrice > 0) {
      this.currentPrice = currentPrice;
    } else if (book.bestBid > 0 && book.bestAsk > 0) {
      this.currentPrice = (book.bestBid + book.bestAsk) / 2;
    }

    this.recalculateLimitWalls();
  }

  // Group depth levels into distinct resting limit walls
  private recalculateLimitWalls() {
    if (!this.currentBook || this.currentPrice <= 0) return;

    const walls: RestingLimitWall[] = [];
    const bids = this.currentBook.bids || [];
    const asks = this.currentBook.asks || [];

    // Calculate total bid/ask volume in book
    const totalBidVol = bids.reduce((acc, b) => acc + b.qty, 0);
    const totalAskVol = asks.reduce((acc, a) => acc + a.qty, 0);

    // Group bids into buckets (within 2-3 ticks)
    const clusterBids = this.clusterDepth(bids, 'buy');
    for (const c of clusterBids) {
      const distance = Math.abs(this.currentPrice - c.price);
      const distancePercent = (distance / this.currentPrice) * 100;
      const pctOfBook = totalBidVol > 0 ? (c.volume / totalBidVol) * 100 : 0;
      const isSignificant = c.volume >= 5.0 || pctOfBook >= 4.0;

      walls.push({
        price: c.price,
        volume: c.volume,
        notional: c.price * c.volume,
        side: 'buy',
        distance,
        distancePercent,
        percentageOfBook: pctOfBook,
        isSignificant,
      });
    }

    // Group asks into buckets
    const clusterAsks = this.clusterDepth(asks, 'sell');
    for (const c of clusterAsks) {
      const distance = Math.abs(c.price - this.currentPrice);
      const distancePercent = (distance / this.currentPrice) * 100;
      const pctOfBook = totalAskVol > 0 ? (c.volume / totalAskVol) * 100 : 0;
      const isSignificant = c.volume >= 5.0 || pctOfBook >= 4.0;

      walls.push({
        price: c.price,
        volume: c.volume,
        notional: c.price * c.volume,
        side: 'sell',
        distance,
        distancePercent,
        percentageOfBook: pctOfBook,
        isSignificant,
      });
    }

    // Sort by volume descending, keep top 30
    this.limitWalls = walls
      .filter((w) => w.volume >= 1.0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 30);
  }

  // Cluster adjacent depth levels to identify solid liquidity walls
  private clusterDepth(
    levels: Array<{ price: number; qty: number }>,
    _side: 'buy' | 'sell'
  ): Array<{ price: number; volume: number }> {
    if (levels.length === 0) return [];

    const bucketStep = Math.max(this.tickSize * 2, 0.20);
    const map = new Map<number, number>();

    for (const lvl of levels) {
      if (!lvl || !Number.isFinite(lvl.price) || !Number.isFinite(lvl.qty) || lvl.qty <= 0) continue;
      const bucket = Math.round(lvl.price / bucketStep) * bucketStep;
      map.set(bucket, (map.get(bucket) || 0) + lvl.qty);
    }

    const res: Array<{ price: number; volume: number }> = [];
    map.forEach((vol, price) => {
      res.push({
        price: Math.round(price * 100) / 100,
        volume: Math.round(vol * 10) / 10,
      });
    });

    return res;
  }

  // Update historical candles & detect BSL / SSL / TP liquidity pools
  public processCandles(candles: Candle[]) {
    if (!candles || candles.length === 0) return;
    this.currentCandles = candles;

    const pools: LiquidityPool[] = [];
    const len = candles.length;
    const windowSize = 3; // pivot window: 3 candles left, 3 candles right

    for (let i = windowSize; i < len - windowSize; i++) {
      const c = candles[i];
      let isHigh = true;
      let isLow = true;

      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j === i) continue;
        if (candles[j].high >= c.high) isHigh = false;
        if (candles[j].low <= c.low) isLow = false;
      }

      if (isHigh) {
        // Buy-Side Liquidity (BSL) = Short Stop Loss Pool & Breakout Buys above swing high
        const price = Math.round(c.high * 100) / 100;
        // Check if price already swept by later candles
        let isSwept = false;
        let sweptTime = 0;
        let maxVolumeAtSweep = 0;

        for (let k = i + 1; k < len; k++) {
          if (candles[k].high > price) {
            isSwept = true;
            sweptTime = candles[k].time * 1000;
            maxVolumeAtSweep = candles[k].volume;
            break;
          }
        }

        const distance = Math.abs(price - this.currentPrice);
        // Estimate stop pool size based on the swing candle volume & duration
        const estimatedVol = Math.round(c.volume * 1.5 * 10) / 10;

        pools.push({
          id: `BSL-${price}-${c.time}`,
          price,
          type: 'BSL',
          description: isSwept ? 'Buy-Side Liquidity (SWEPT)' : 'BSL (Short SL Pool / Breakout)',
          time: c.time * 1000,
          estimatedVolume: Math.max(10, estimatedVol),
          isSwept,
          sweptAtTime: isSwept ? sweptTime : undefined,
          sweptVolume: isSwept ? maxVolumeAtSweep : undefined,
          distance,
        });
      }

      if (isLow) {
        // Sell-Side Liquidity (SSL) = Long Stop Loss Pool & Breakdown Sells below swing low
        const price = Math.round(c.low * 100) / 100;
        let isSwept = false;
        let sweptTime = 0;
        let maxVolumeAtSweep = 0;

        for (let k = i + 1; k < len; k++) {
          if (candles[k].low < price) {
            isSwept = true;
            sweptTime = candles[k].time * 1000;
            maxVolumeAtSweep = candles[k].volume;
            break;
          }
        }

        const distance = Math.abs(this.currentPrice - price);
        const estimatedVol = Math.round(c.volume * 1.5 * 10) / 10;

        pools.push({
          id: `SSL-${price}-${c.time}`,
          price,
          type: 'SSL',
          description: isSwept ? 'Sell-Side Liquidity (SWEPT)' : 'SSL (Long SL Pool / Breakdown)',
          time: c.time * 1000,
          estimatedVolume: Math.max(10, estimatedVol),
          isSwept,
          sweptAtTime: isSwept ? sweptTime : undefined,
          sweptVolume: isSwept ? maxVolumeAtSweep : undefined,
          distance,
        });
      }
    }

    // Keep unique price levels and sort by proximity to current price
    const uniqueMap = new Map<number, LiquidityPool>();
    for (const p of pools) {
      const rounded = Math.round(p.price * 2) / 2;
      const existing = uniqueMap.get(rounded);
      if (!existing || p.time > existing.time) {
        uniqueMap.set(rounded, p);
      }
    }

    this.liquidityPools = Array.from(uniqueMap.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 25);
  }

  // Feed live incoming trades to detect execution & order sweep events
  public processTrade(trade: RawTrade) {
    if (!trade || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.qty) || trade.qty <= 0) {
      return;
    }

    this.currentPrice = trade.price;
    this.tradeHistory.push(trade);
    if (this.tradeHistory.length > 3000) {
      this.tradeHistory.shift();
    }

    // Check if trade interacted with any active Liquidity Pools (BSL or SSL)
    const bucket = Math.round(trade.price * 2) / 2;

    // Check pools within 0.50 points
    for (const pool of this.liquidityPools) {
      if (Math.abs(trade.price - pool.price) <= 0.35) {
        if (!pool.isSwept) {
          pool.isSwept = true;
          pool.sweptAtTime = trade.time;
          pool.sweptVolume = (pool.sweptVolume || 0) + trade.qty;
          pool.description = `${pool.type} (SWEPT)`;
        } else {
          pool.sweptVolume = (pool.sweptVolume || 0) + trade.qty;
        }
      }
    }

    // Check active tracking for sweep cluster
    let tracker = this.activeSweepTracking.get(bucket);
    const now = trade.time;

    if (!tracker || now - tracker.lastTime > 1500) {
      // Clean up old tracked buckets & finalize reaction
      this.finalizeOldTrackers(now);

      tracker = {
        startTime: now,
        lastTime: now,
        volume: trade.qty,
        buyVolume: trade.side === 'buy' ? trade.qty : 0,
        sellVolume: trade.side === 'sell' ? trade.qty : 0,
        startPrice: trade.price,
        highPrice: trade.price,
        lowPrice: trade.price,
        isRecorded: false,
      };
      this.activeSweepTracking.set(bucket, tracker);
    } else {
      tracker.lastTime = now;
      tracker.volume += trade.qty;
      if (trade.side === 'buy') tracker.buyVolume += trade.qty;
      else tracker.sellVolume += trade.qty;
      if (trade.price > tracker.highPrice) tracker.highPrice = trade.price;
      if (trade.price < tracker.lowPrice) tracker.lowPrice = trade.price;
    }

    // Check if volume is large enough to be a Sweep Event (e.g. >= 2.5 XAU for gold, or hit a resting limit wall)
    const matchingWall = this.limitWalls.find((w) => Math.abs(w.price - trade.price) <= 0.35);
    const matchingPool = this.liquidityPools.find((p) => Math.abs(p.price - trade.price) <= 0.35);

    const sweepThreshold = matchingWall ? Math.min(2.0, matchingWall.volume * 0.4) : 2.5;

    if (tracker.volume >= sweepThreshold && !tracker.isRecorded) {
      tracker.isRecorded = true;

      let sweepType: SweptOrderEvent['type'] =
        tracker.buyVolume >= tracker.sellVolume ? 'limit_sell_swept' : 'limit_buy_swept';

      if (matchingPool) {
        sweepType = matchingPool.type === 'BSL' ? 'bsl_swept' : 'ssl_swept';
      }

      const aggressorSide = tracker.buyVolume >= tracker.sellVolume ? 'buy' : 'sell';

      const event: SweptOrderEvent = {
        id: `sweep-${bucket}-${now}`,
        time: now,
        price: bucket,
        type: sweepType,
        volume: Math.round(tracker.volume * 10) / 10,
        notional: Math.round(bucket * tracker.volume),
        aggressorSide,
        reaction: 'pending',
        initialRestingVolume: matchingWall ? matchingWall.volume : matchingPool?.estimatedVolume,
        highAfterSweep: tracker.highPrice,
        lowAfterSweep: tracker.lowPrice,
      };

      this.sweptEvents.unshift(event);
      if (this.sweptEvents.length > this.maxSweptEvents) {
        this.sweptEvents.pop();
      }
    }
  }

  // Evaluate market reaction (Absorption Reversal vs Breakout Continuation)
  private finalizeOldTrackers(now: number) {
    this.activeSweepTracking.forEach((tracker, bucket) => {
      if (now - tracker.lastTime > 2500) {
        // Find corresponding swept event to evaluate reaction
        const evt = this.sweptEvents.find((e) => Math.abs(e.price - bucket) < 0.01 && e.reaction === 'pending');
        if (evt) {
          // If aggressor was BUY, but price fell back below the sweep bucket -> Absorption Reversal!
          // If aggressor was BUY and price stayed above -> Breakout Continuation!
          if (evt.aggressorSide === 'buy') {
            evt.reaction = this.currentPrice < evt.price - 0.20 ? 'absorbed_reversal' : 'breakout_continuation';
          } else {
            // Aggressor SELL: if price rallied back above sweep bucket -> Absorption Reversal!
            evt.reaction = this.currentPrice > evt.price + 0.20 ? 'absorbed_reversal' : 'breakout_continuation';
          }
        }
        this.activeSweepTracking.delete(bucket);
      }
    });
  }

  // Pre-load historical trades to backfill swept orders
  public setHistoricalTrades(trades: RawTrade[]) {
    this.tradeHistory = trades;
    this.sweptEvents = [];
    for (const t of trades) {
      this.processTrade(t);
    }
  }

  // Interactive Range Measurement: inspect any user-selected price band
  public measureRange(
    minPrice: number,
    maxPrice: number,
    _startTime?: number,
    _endTime?: number
  ): RangeMeasurementResult {
    const low = Math.min(minPrice, maxPrice);
    const high = Math.max(minPrice, maxPrice);
    const priceSpan = Math.round((high - low) * 100) / 100;
    const pointSpan = Math.round(priceSpan / this.tickSize);

    // Filter resting limit walls in range
    let totalRestingBuy = 0;
    let totalRestingSell = 0;
    let restingBuyCount = 0;
    let restingSellCount = 0;

    if (this.currentBook) {
      for (const b of this.currentBook.bids) {
        if (b.price >= low && b.price <= high) {
          totalRestingBuy += b.qty;
          restingBuyCount++;
        }
      }
      for (const a of this.currentBook.asks) {
        if (a.price >= low && a.price <= high) {
          totalRestingSell += a.qty;
          restingSellCount++;
        }
      }
    }

    // Filter liquidity pools in range
    const pools = this.liquidityPools.filter((p) => p.price >= low && p.price <= high);

    // Calculate trades & swept volume in range
    let totalFilledVolume = 0;
    let buyFillVolume = 0;
    let sellFillVolume = 0;

    for (const t of this.tradeHistory) {
      if (t.price >= low && t.price <= high) {
        totalFilledVolume += t.qty;
        if (t.side === 'buy') buyFillVolume += t.qty;
        else sellFillVolume += t.qty;
      }
    }

    // Recent sweeps in range
    const recentSweeps = this.sweptEvents.filter((s) => s.price >= low && s.price <= high);

    return {
      minPrice: low,
      maxPrice: high,
      priceSpan,
      pointSpan,
      totalRestingBuy: Math.round(totalRestingBuy * 10) / 10,
      totalRestingSell: Math.round(totalRestingSell * 10) / 10,
      restingBuyCount,
      restingSellCount,
      pools,
      totalFilledVolume: Math.round(totalFilledVolume * 10) / 10,
      buyFillVolume: Math.round(buyFillVolume * 10) / 10,
      sellFillVolume: Math.round(sellFillVolume * 10) / 10,
      netDelta: Math.round((buyFillVolume - sellFillVolume) * 10) / 10,
      recentSweeps,
    };
  }
}
