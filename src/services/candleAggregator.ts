import { Candle, RawTrade, Timeframe } from '../types/market';

export function timeframeToSeconds(tf: Timeframe): number {
  switch (tf) {
    case '1s': return 1;
    case '5s': return 5;
    case '15s': return 15;
    case '30s': return 30;
    case '1m': return 60;
    case '3m': return 180;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    default: return 60;
  }
}

export function isSubMinute(tf: Timeframe): boolean {
  return tf === '1s' || tf === '5s' || tf === '15s' || tf === '30s';
}

export class CandleAggregator {
  private timeframe: Timeframe = '1s';
  private candles: Candle[] = [];
  private currentCandle: Candle | null = null;
  private onUpdateCallback?: (candles: Candle[]) => void;
  private maxCandles: number = 5000;

  constructor(tf: Timeframe, onUpdate?: (candles: Candle[]) => void) {
    this.timeframe = tf;
    this.onUpdateCallback = onUpdate;
  }

  public setTimeframe(tf: Timeframe) {
    this.timeframe = tf;
    this.candles = [];
    this.currentCandle = null;
  }

  public setCandles(candles: Candle[]) {
    this.candles = candles
      .filter((c) => c && Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.close) && c.open > 0 && c.close > 0)
      .map((c) => {
        const open = c.open;
        const close = c.close;
        const high = Number.isFinite(c.high) && c.high >= Math.max(open, close) ? c.high : Math.max(open, close);
        const low = Number.isFinite(c.low) && c.low > 0 && c.low <= Math.min(open, close) ? c.low : Math.min(open, close);
        return {
          ...c,
          open,
          high,
          low,
          close,
        };
      });

    if (this.candles.length > 0) {
      this.currentCandle = { ...this.candles[this.candles.length - 1] };
    } else {
      this.currentCandle = null;
    }
    this.notify();
  }

  public getCandles(): Candle[] {
    if (!this.currentCandle) return this.candles;
    const list = [...this.candles];
    if (list.length > 0 && list[list.length - 1].time === this.currentCandle.time) {
      list[list.length - 1] = this.currentCandle;
    } else {
      list.push(this.currentCandle);
    }
    return list;
  }

  public processTrade(trade: RawTrade) {
    if (!trade || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.qty) || trade.qty < 0) {
      return;
    }

    // Reject extreme outlier ticks (e.g. flash crash bug or corrupt 0/anomaly >30% from close)
    if (this.currentCandle && this.currentCandle.close > 0) {
      const ratio = trade.price / this.currentCandle.close;
      if (ratio < 0.70 || ratio > 1.40) {
        console.warn(`[CandleAggregator] Rejected outlier trade price: ${trade.price} vs close: ${this.currentCandle.close}`);
        return;
      }
    }

    const intervalSec = timeframeToSeconds(this.timeframe);
    const tradeSec = Math.floor(trade.time / 1000);
    const bucketTime = Math.floor(tradeSec / intervalSec) * intervalSec;

    if (!this.currentCandle) {
      this.currentCandle = {
        time: bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
        buyVolume: trade.side === 'buy' ? trade.qty : 0,
        sellVolume: trade.side === 'sell' ? trade.qty : 0,
      };
      this.candles.push(this.currentCandle);
    } else if (bucketTime === this.currentCandle.time) {
      // Update existing candle
      this.currentCandle.high = Math.max(this.currentCandle.high, trade.price);
      this.currentCandle.low = this.currentCandle.low > 0 ? Math.min(this.currentCandle.low, trade.price) : trade.price;
      this.currentCandle.close = trade.price;
      this.currentCandle.volume += trade.qty;
      if (trade.side === 'buy') {
        this.currentCandle.buyVolume = (this.currentCandle.buyVolume || 0) + trade.qty;
      } else {
        this.currentCandle.sellVolume = (this.currentCandle.sellVolume || 0) + trade.qty;
      }
      if (this.candles.length > 0) {
        this.candles[this.candles.length - 1] = this.currentCandle;
      } else {
        this.candles.push(this.currentCandle);
      }
    } else if (bucketTime > this.currentCandle.time) {
      const prevClose = this.currentCandle.close;
      // Backfill any missing steps for sub-minute timeframes (capped at 60 steps to keep responsive)
      if (isSubMinute(this.timeframe)) {
        const missingSteps = Math.min(60, Math.floor((bucketTime - this.currentCandle.time) / intervalSec) - 1);
        for (let s = 1; s <= missingSteps; s++) {
          const gapTime = this.currentCandle.time + s * intervalSec;
          this.candles.push({
            time: gapTime,
            open: prevClose,
            high: prevClose,
            low: prevClose,
            close: prevClose,
            volume: 0,
            buyVolume: 0,
            sellVolume: 0,
          });
        }
      }

      // Start new candle
      this.currentCandle = {
        time: bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
        buyVolume: trade.side === 'buy' ? trade.qty : 0,
        sellVolume: trade.side === 'sell' ? trade.qty : 0,
      };
      this.candles.push(this.currentCandle);

      while (this.candles.length > this.maxCandles) {
        this.candles.shift();
      }
    }

    this.notify();
  }

  // Aggregate raw trades into candles for initial historical lookback
  public static aggregateTrades(trades: RawTrade[], tf: Timeframe): Candle[] {
    const intervalSec = timeframeToSeconds(tf);
    const candleMap = new Map<number, Candle>();

    for (const t of trades) {
      if (!t || !Number.isFinite(t.price) || t.price <= 0 || !Number.isFinite(t.qty) || t.qty <= 0) continue;
      const tradeSec = Math.floor(t.time / 1000);
      const bucketTime = Math.floor(tradeSec / intervalSec) * intervalSec;

      let c = candleMap.get(bucketTime);
      if (!c) {
        c = {
          time: bucketTime,
          open: t.price,
          high: t.price,
          low: t.price,
          close: t.price,
          volume: t.qty,
          buyVolume: t.side === 'buy' ? t.qty : 0,
          sellVolume: t.side === 'sell' ? t.qty : 0,
        };
        candleMap.set(bucketTime, c);
      } else {
        c.high = Math.max(c.high, t.price);
        c.low = c.low > 0 ? Math.min(c.low, t.price) : t.price;
        c.close = t.price;
        c.volume += t.qty;
        if (t.side === 'buy') {
          c.buyVolume = (c.buyVolume || 0) + t.qty;
        } else {
          c.sellVolume = (c.sellVolume || 0) + t.qty;
        }
      }
    }

    const sortedCandles = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    if (sortedCandles.length <= 1) return sortedCandles;

    // Fill gaps between trade candles so sequence is smooth
    const filled: Candle[] = [];
    for (let i = 0; i < sortedCandles.length; i++) {
      if (i > 0) {
        const prev = filled[filled.length - 1];
        const cur = sortedCandles[i];
        const gapSteps = Math.min(120, Math.floor((cur.time - prev.time) / intervalSec) - 1);
        for (let s = 1; s <= gapSteps; s++) {
          filled.push({
            time: prev.time + s * intervalSec,
            open: prev.close,
            high: prev.close,
            low: prev.close,
            close: prev.close,
            volume: 0,
            buyVolume: 0,
            sellVolume: 0,
          });
        }
      }
      filled.push(sortedCandles[i]);
    }
    return filled;
  }

  // Synthesize 1m klines into sub-minute candles (e.g. 1s, 5s) without mixing raw 60s bars
  public static mergeKlinesWithSubMinute(klines: Candle[], subMinuteCandles: Candle[], tf: Timeframe = '1s'): Candle[] {
    const intervalSec = timeframeToSeconds(tf);
    if (!subMinuteCandles || subMinuteCandles.length === 0) {
      if (!klines || klines.length === 0) return [];
      // Expand recent 15 minutes of klines into subMinute resolution
      return CandleAggregator.expandKlines(klines.slice(-15), intervalSec);
    }

    const earliestSubMinuteTime = subMinuteCandles[0].time;
    // Take recent 1m klines prior to earliestSubMinuteTime (up to 15 minutes lookback)
    const recentPriorKlines = klines
      .filter((k) => k.time < earliestSubMinuteTime && k.time >= earliestSubMinuteTime - 900)
      .slice(-15);

    const expandedPrior = CandleAggregator.expandKlines(recentPriorKlines, intervalSec);
    const combined = [...expandedPrior, ...subMinuteCandles].sort((a, b) => a.time - b.time);

    // De-duplicate any overlapping times
    const deduped: Candle[] = [];
    for (const c of combined) {
      if (deduped.length === 0 || deduped[deduped.length - 1].time !== c.time) {
        deduped.push(c);
      }
    }
    return deduped;
  }

  // Expands 1m klines into uniform sub-minute candles (e.g. 1s candles)
  private static expandKlines(klines: Candle[], intervalSec: number): Candle[] {
    const result: Candle[] = [];
    for (const k of klines) {
      if (!k || k.open <= 0 || k.close <= 0) continue;
      const steps = Math.floor(60 / intervalSec);
      if (steps <= 0) continue;
      const volPerStep = k.volume / steps;
      const isUp = k.close >= k.open;

      for (let s = 0; s < steps; s++) {
        const t = k.time + s * intervalSec;
        const progress = s / steps;
        // Natural OHLC curve for smooth synthesis
        let price = k.open;
        if (progress < 0.25) {
          price = k.open + (isUp ? (k.low - k.open) * (progress / 0.25) : (k.high - k.open) * (progress / 0.25));
        } else if (progress < 0.75) {
          const p = (progress - 0.25) / 0.5;
          price = isUp ? k.low + (k.high - k.low) * p : k.high - (k.high - k.low) * p;
        } else {
          const p = (progress - 0.75) / 0.25;
          price = isUp ? k.high + (k.close - k.high) * p : k.low + (k.close - k.low) * p;
        }

        const open = s === 0 ? k.open : result[result.length - 1].close;
        const close = s === steps - 1 ? k.close : Math.max(0.01, price);
        const high = Math.max(open, close, Math.min(k.high, Math.max(open, close) + 0.05));
        const low = Math.max(0.01, Math.min(open, close, Math.max(k.low, Math.min(open, close) - 0.05)));

        result.push({
          time: t,
          open,
          high,
          low,
          close,
          volume: volPerStep,
        });
      }
    }
    return result;
  }

  private notify() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getCandles());
    }
  }
}
