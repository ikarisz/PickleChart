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
  private barMs: number = 60_000;
  private poolRebuildKey: string = '';
  // ~25k trades covers roughly an hour of XAUUSDT flow, enough to measure
  // volume beyond a level for sweeps on 1m–5m bars from real ticks
  private maxTradeHistory: number = 25_000;

  // Sweep reaction evaluation: first threshold hit wins; neither within the window = stalled
  private reactionFollowPts: number = 0.5;
  private reactionReversePts: number = 0.5;
  private reactionWindowMs: number = 30_000;
  // event id -> reference price (last trade price when the sweep was recorded)
  private reactionRef: Map<string, number> = new Map();

  // Key-absorption detection
  private recentSweepVolumes: number[] = []; // rolling, for the size percentile
  private absorbMinVolume: number = 8; // XAU floor, whatever the percentile says
  private absorbPercentile: number = 0.8; // single absorb must beat this share of recent sweeps
  private stackWindowMs: number = 60_000; // absorbs at the same level within this window add up
  private stackPriceTol: number = 0.5;

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
    // distances change with every trade; keep the list ordered by proximity
    this.liquidityPools.sort((a, b) => a.distance - b.distance);
    return this.liquidityPools;
  }

  // Buffered ticks (ascending by time); read-only use, e.g. for the volume profile
  public getTradeHistory(): readonly RawTrade[] {
    return this.tradeHistory;
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

  // Update historical candles & detect BSL / SSL liquidity pools.
  // Pivot detection is O(n^2) over up to ~1500 candles, so it only re-runs when
  // a candle closes (or when forced, e.g. after a history load). Between closes,
  // processTrade() keeps sweep state and distances current.
  public processCandles(candles: Candle[], force: boolean = false) {
    if (!candles || candles.length === 0) return;
    this.currentCandles = candles;

    const len = candles.length;
    if (len >= 2) {
      const step = (candles[len - 1].time - candles[len - 2].time) * 1000;
      if (step > 0) this.barMs = step;
    }

    const key = `${len}|${candles[0].time}|${len >= 2 ? candles[len - 2].time : 0}`;
    if (!force && key === this.poolRebuildKey) return;
    this.poolRebuildKey = key;

    const prevById = new Map(this.liquidityPools.map((p) => [p.id, p] as const));
    const pools: LiquidityPool[] = [];
    const windowSize = 3; // pivot window: 3 candles left, 3 closed candles right
    const closedLen = len - 1; // last candle is still forming

    for (let i = windowSize; i < closedLen - windowSize; i++) {
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
        pools.push(this.buildPool('BSL', c, candles, i, prevById));
      }
      if (isLow) {
        // Sell-Side Liquidity (SSL) = Long Stop Loss Pool & Breakdown Sells below swing low
        pools.push(this.buildPool('SSL', c, candles, i, prevById));
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

  private buildPool(
    type: 'BSL' | 'SSL',
    c: Candle,
    candles: Candle[],
    i: number,
    prevById: Map<string, LiquidityPool>
  ): LiquidityPool {
    const price = Math.round((type === 'BSL' ? c.high : c.low) * 100) / 100;
    const id = `${type}-${price}-${c.time}`;
    const beyond = (x: number) => (type === 'BSL' ? x > price : x < price);

    let isSwept = false;
    let sweptAtTime: number | undefined;
    let sweptVolume: number | undefined;
    let sweptVolumeSource: LiquidityPool['sweptVolumeSource'];

    for (let k = i + 1; k < candles.length; k++) {
      if (beyond(type === 'BSL' ? candles[k].high : candles[k].low)) {
        isSwept = true;
        sweptAtTime = candles[k].time * 1000;
        const fromTrades = this.volumeBeyond(price, type, sweptAtTime, sweptAtTime + this.barMs);
        if (fromTrades !== null) {
          sweptVolume = fromTrades;
          sweptVolumeSource = 'trades';
        } else {
          // No tick data for that bar: fall back to the whole bar's volume (upper bound)
          sweptVolume = candles[k].volume;
          sweptVolumeSource = 'candle';
        }
        break;
      }
    }

    // Keep a sweep that live trades detected but candles don't reflect yet
    const prev = prevById.get(id);
    if (!isSwept && prev?.isSwept) {
      isSwept = true;
      sweptAtTime = prev.sweptAtTime;
      sweptVolume = prev.sweptVolume;
      sweptVolumeSource = prev.sweptVolumeSource;
    }

    const label = type === 'BSL' ? 'BSL (Short SL Pool / Breakout)' : 'SSL (Long SL Pool / Breakdown)';
    const sweptLabel = type === 'BSL' ? 'Buy-Side Liquidity (SWEPT)' : 'Sell-Side Liquidity (SWEPT)';

    return {
      id,
      price,
      type,
      description: isSwept ? sweptLabel : label,
      time: c.time * 1000,
      // Volume of the swing bar itself — a proxy for interest at the level, not a measured stop size
      estimatedVolume: Math.round(c.volume * 10) / 10,
      isSwept,
      sweptAtTime: isSwept ? sweptAtTime : undefined,
      sweptVolume: isSwept && sweptVolume !== undefined ? Math.round(sweptVolume * 10) / 10 : undefined,
      sweptVolumeSource: isSwept ? sweptVolumeSource : undefined,
      distance: this.currentPrice > 0 ? Math.abs(price - this.currentPrice) : 0,
    };
  }

  // Volume traded strictly beyond `price` within [from, to). Returns null when
  // the trade buffer does not cover the start of that window.
  private volumeBeyond(price: number, type: 'BSL' | 'SSL', from: number, to: number): number | null {
    const h = this.tradeHistory;
    if (h.length === 0 || h[0].time > from) return null;
    let vol = 0;
    for (const t of h) {
      if (t.time < from || t.time >= to) continue;
      if (type === 'BSL' ? t.price > price : t.price < price) vol += t.qty;
    }
    return vol;
  }

  // Feed live incoming trades to detect execution & order sweep events
  public processTrade(trade: RawTrade) {
    if (!trade || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.qty) || trade.qty <= 0) {
      return;
    }

    this.currentPrice = trade.price;
    this.tradeHistory.push(trade);
    // Trim in chunks: shift() on a 25k array per trade would be O(n) each time
    if (this.tradeHistory.length > this.maxTradeHistory + 1000) {
      this.tradeHistory.splice(0, this.tradeHistory.length - this.maxTradeHistory);
    }

    this.evaluateReactions(trade);

    // A pool is swept only when price trades strictly beyond it (not a touch),
    // after the swing bar has closed. Volume counts only trades beyond the level
    // within the bar in which the sweep happened.
    const bucket = Math.round(trade.price * 2) / 2;

    for (const pool of this.liquidityPools) {
      pool.distance = Math.abs(trade.price - pool.price);
      const isBeyond = pool.type === 'BSL' ? trade.price > pool.price : trade.price < pool.price;
      if (!isBeyond || trade.time < pool.time + this.barMs) continue;

      if (!pool.isSwept) {
        pool.isSwept = true;
        pool.sweptAtTime = trade.time;
        pool.sweptVolume = trade.qty;
        pool.sweptVolumeSource = 'trades';
        pool.description = pool.type === 'BSL' ? 'Buy-Side Liquidity (SWEPT)' : 'Sell-Side Liquidity (SWEPT)';
      } else if (pool.sweptVolumeSource === 'trades' && pool.sweptAtTime !== undefined) {
        const barStart = Math.floor(pool.sweptAtTime / this.barMs) * this.barMs;
        if (trade.time < barStart + this.barMs) {
          pool.sweptVolume = Math.round(((pool.sweptVolume || 0) + trade.qty) * 10) / 10;
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
        initialRestingVolume: matchingWall ? matchingWall.volume : undefined,
        highAfterSweep: trade.price,
        lowAfterSweep: trade.price,
      };

      this.sweptEvents.unshift(event);
      this.reactionRef.set(event.id, trade.price);
      this.recentSweepVolumes.push(event.volume);
      if (this.recentSweepVolumes.length > 200) this.recentSweepVolumes.shift();
      if (this.sweptEvents.length > this.maxSweptEvents) {
        const dropped = this.sweptEvents.pop();
        if (dropped) this.reactionRef.delete(dropped.id);
      }
    }
  }

  // Drop sweep-cluster trackers that have gone quiet
  private finalizeOldTrackers(now: number) {
    this.activeSweepTracking.forEach((tracker, bucket) => {
      if (now - tracker.lastTime > 2500) {
        this.activeSweepTracking.delete(bucket);
      }
    });
  }

  // Classify each pending sweep by what price does next, measured from the
  // sweep's reference price in the aggressor's direction:
  //   +reactionFollowPts first  -> breakout_continuation
  //   -reactionReversePts first -> absorbed_reversal
  //   neither within reactionWindowMs -> stalled
  private evaluateReactions(trade: RawTrade) {
    for (const evt of this.sweptEvents) {
      if (evt.reaction !== 'pending') continue;
      const ref = this.reactionRef.get(evt.id);
      if (ref === undefined) continue;
      if (trade.time < evt.time) continue;

      evt.highAfterSweep = Math.max(evt.highAfterSweep ?? trade.price, trade.price);
      evt.lowAfterSweep = Math.min(evt.lowAfterSweep ?? trade.price, trade.price);

      const dir = evt.aggressorSide === 'buy' ? 1 : -1;
      const move = (trade.price - ref) * dir;

      if (move >= this.reactionFollowPts) {
        evt.reaction = 'breakout_continuation';
      } else if (move <= -this.reactionReversePts) {
        evt.reaction = 'absorbed_reversal';
        this.flagSignificantAbsorption(evt);
      } else if (trade.time - evt.time > this.reactionWindowMs) {
        evt.reaction = 'stalled';
      }
      if (evt.reaction !== 'pending') this.reactionRef.delete(evt.id);
    }
  }

  // Size threshold for a single absorption to count as "key"
  public getAbsorbThreshold(): number {
    const v = [...this.recentSweepVolumes].sort((a, b) => a - b);
    const pct = v.length >= 10 ? v[Math.min(v.length - 1, Math.floor(v.length * this.absorbPercentile))] : 0;
    return Math.max(this.absorbMinVolume, pct);
  }

  // Mark an absorbed_reversal as significant when it is large on its own, or when
  // absorptions stack at the same level; attach context (pool / wall) as tags.
  private flagSignificantAbsorption(evt: SweptOrderEvent) {
    const threshold = this.getAbsorbThreshold();

    const stacked = this.sweptEvents.filter(
      (e) =>
        e.reaction === 'absorbed_reversal' &&
        e.aggressorSide === evt.aggressorSide &&
        Math.abs(e.price - evt.price) <= this.stackPriceTol &&
        Math.abs(e.time - evt.time) <= this.stackWindowMs
    );
    const stackVol = stacked.reduce((a, e) => a + e.volume, 0);

    const big = evt.volume >= threshold;
    const stack = stacked.length >= 2 && stackVol >= threshold * 1.5;
    if (!big && !stack) return;

    const tags: string[] = [];
    const pool = this.liquidityPools.find((p) => Math.abs(p.price - evt.price) <= 0.5);
    if (pool) tags.push(`${pool.type} pool`);
    const wall = this.limitWalls.find((w) => Math.abs(w.price - evt.price) <= 0.5);
    if (wall) tags.push(`Wall ${wall.volume.toFixed(0)} XAU`);
    if (stack) tags.push(`×${stacked.length} stacked ${stackVol.toFixed(1)} XAU`);

    evt.significant = true;
    evt.significanceTags = tags;
    // Only the newest event of a stack carries the stack flag, so alerts don't repeat;
    // an earlier absorb that was big on its own keeps its flag (minus the stack tag)
    for (const e of stacked) {
      if (e === evt || !e.significant || !e.significanceTags?.some((t) => t.includes('stacked'))) continue;
      if (e.volume >= threshold) {
        e.significanceTags = e.significanceTags.filter((t) => !t.includes('stacked'));
      } else {
        e.significant = false;
      }
    }
  }

  // Pre-load historical trades to backfill swept orders
  public setHistoricalTrades(trades: RawTrade[]) {
    // processTrade() appends to tradeHistory itself; start empty so the input
    // array isn't mutated mid-iteration and trades aren't double-counted.
    this.tradeHistory = [];
    this.sweptEvents = [];
    this.reactionRef.clear();
    this.activeSweepTracking.clear();
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
