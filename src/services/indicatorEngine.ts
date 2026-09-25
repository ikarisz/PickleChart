import { Candle } from '../types/market';

export interface IndicatorPoint {
  time: number; // Unix seconds
  value: number;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export class IndicatorEngine {
  /**
   * Exponential Moving Average (EMA)
   */
  public static calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
    if (!candles || candles.length < period) return [];

    const result: IndicatorPoint[] = [];
    const k = 2 / (period + 1);

    // Initial SMA for the first period
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    let prevEMA = sum / period;
    result.push({ time: candles[period - 1].time, value: prevEMA });

    for (let i = period; i < candles.length; i++) {
      const c = candles[i];
      const curEMA = c.close * k + prevEMA * (1 - k);
      result.push({ time: c.time, value: curEMA });
      prevEMA = curEMA;
    }

    return result;
  }

  /**
   * Session Volume Weighted Average Price (VWAP)
   */
  public static calculateVWAP(candles: Candle[]): IndicatorPoint[] {
    if (!candles || candles.length === 0) return [];

    const result: IndicatorPoint[] = [];
    let cumVolume = 0;
    let cumVolPrice = 0;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const vol = c.volume || 1.0;

      cumVolume += vol;
      cumVolPrice += typicalPrice * vol;

      const vwap = cumVolume > 0 ? cumVolPrice / cumVolume : c.close;
      result.push({ time: c.time, value: vwap });
    }

    return result;
  }

  /**
   * Cumulative Volume Delta (running sum of buy − sell aggressor volume per candle).
   * Candles without taker split fall back to a close-vs-open estimate (60/40), flagged as estimated.
   */
  public static calculateCVD(candles: Candle[]): Array<IndicatorPoint & { delta: number; estimated: boolean }> {
    const result: Array<IndicatorPoint & { delta: number; estimated: boolean }> = [];
    let cum = 0;
    for (const c of candles) {
      const buy = c.buyVolume ?? 0;
      const sell = c.sellVolume ?? 0;
      let delta: number;
      let estimated = false;
      if (buy + sell > 0) {
        delta = buy - sell;
      } else {
        const vol = c.volume || 0;
        delta = c.close > c.open ? vol * 0.2 : c.close < c.open ? -vol * 0.2 : 0;
        estimated = vol > 0;
      }
      cum += delta;
      result.push({ time: c.time, value: cum, delta, estimated });
    }
    return result;
  }

  /**
   * Bollinger Bands (SMA 20, 2 StdDev)
   */
  public static calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    stdDevMult: number = 2
  ): BollingerPoint[] {
    if (!candles || candles.length < period) return [];

    const result: BollingerPoint[] = [];

    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j].close;
      }
      const middle = sum / period;

      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(candles[j].close - middle, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);

      result.push({
        time: candles[i].time,
        middle,
        upper: middle + stdDev * stdDevMult,
        lower: middle - stdDev * stdDevMult,
      });
    }

    return result;
  }
}
