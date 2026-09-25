import { Candle, RawTrade } from '../types/market';

export interface VolumeProfileRow {
  price: number; // lower edge of the bin
  buy: number; // from ticks
  sell: number; // from ticks
  estBuy: number; // estimated from candles (no tick data for that period)
  estSell: number;
  total: number;
}

export interface VolumeProfile {
  binSize: number;
  rows: VolumeProfileRow[]; // ascending by price
  maxTotal: number;
  pocPrice: number; // centre of the POC bin
  vahPrice: number; // top of the value area
  valPrice: number; // bottom of the value area
  totalVolume: number;
  tickShare: number; // 0..1 share of volume that came from real ticks
}

const NICE_STEPS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10, 25, 50, 100, 250, 500];

// Smallest "nice" bin that keeps each row at least `minRowPx` tall on screen
export function pickBinSize(pricePerPx: number, minRowPx: number = 3, minBin: number = 0.01): number {
  const target = Math.max(minBin, pricePerPx * minRowPx);
  for (const s of NICE_STEPS) if (s >= target) return s;
  return NICE_STEPS[NICE_STEPS.length - 1];
}

/**
 * Visible-range volume profile.
 * - Trades (ticks) are exact: each trade's qty goes into its price bin, split by aggressor side.
 * - Periods older than the tick buffer fall back to candles: each candle's volume is spread
 *   evenly across the bins its high–low range covers (an approximation, flagged as est*).
 * The hand-over point is the end of the candle containing the oldest buffered trade, so no
 * period is counted twice.
 */
export function computeVolumeProfile(
  candles: Candle[],
  trades: RawTrade[],
  fromSec: number,
  toSec: number,
  tfSec: number,
  binSize: number,
  valueAreaPct: number = 0.7
): VolumeProfile | null {
  if (binSize <= 0 || toSec <= fromSec) return null;

  const firstTradeMs = trades.length > 0 ? trades[0].time : Infinity;
  // End of the candle bucket that contains the first buffered trade
  const cutMs = Number.isFinite(firstTradeMs)
    ? (Math.floor(firstTradeMs / 1000 / tfSec) * tfSec + tfSec) * 1000
    : Infinity;

  const bins = new Map<number, VolumeProfileRow>();
  const binOf = (p: number) => Math.floor(p / binSize + 1e-9);
  const row = (k: number) => {
    let r = bins.get(k);
    if (!r) {
      r = { price: k * binSize, buy: 0, sell: 0, estBuy: 0, estSell: 0, total: 0 };
      bins.set(k, r);
    }
    return r;
  };

  let tickVol = 0;
  let estVol = 0;

  // 1. Candle estimate for bars that end before tick coverage starts
  for (const c of candles) {
    const startMs = c.time * 1000;
    const endMs = startMs + tfSec * 1000;
    if (c.time + tfSec <= fromSec || c.time >= toSec) continue;
    if (endMs > cutMs) continue;
    if (!(c.volume > 0) || !(c.high >= c.low)) continue;

    const lo = binOf(c.low);
    const hi = binOf(c.high);
    const n = hi - lo + 1;
    let buyShare = 0.5;
    if ((c.buyVolume ?? 0) + (c.sellVolume ?? 0) > 0) {
      buyShare = (c.buyVolume ?? 0) / ((c.buyVolume ?? 0) + (c.sellVolume ?? 0));
    } else if (c.close !== c.open) {
      buyShare = c.close > c.open ? 0.6 : 0.4;
    }
    const per = c.volume / n;
    for (let k = lo; k <= hi; k++) {
      const r = row(k);
      r.estBuy += per * buyShare;
      r.estSell += per * (1 - buyShare);
    }
    estVol += c.volume;
  }

  // 2. Exact ticks
  const fromMs = Math.max(fromSec * 1000, Number.isFinite(cutMs) ? cutMs : -Infinity);
  const toMs = toSec * 1000;
  for (const t of trades) {
    if (t.time < fromMs || t.time >= toMs) continue;
    const r = row(binOf(t.price));
    if (t.side === 'buy') r.buy += t.qty;
    else r.sell += t.qty;
    tickVol += t.qty;
  }

  if (bins.size === 0) return null;

  // 3. Fill gaps so the value-area walk sees contiguous rows
  const keys = [...bins.keys()];
  const kMin = Math.min(...keys);
  const kMax = Math.max(...keys);
  const rows: VolumeProfileRow[] = [];
  let maxTotal = 0;
  let pocIdx = 0;
  let total = 0;
  for (let k = kMin; k <= kMax; k++) {
    const r = bins.get(k) ?? { price: k * binSize, buy: 0, sell: 0, estBuy: 0, estSell: 0, total: 0 };
    r.total = r.buy + r.sell + r.estBuy + r.estSell;
    total += r.total;
    if (r.total > maxTotal) {
      maxTotal = r.total;
      pocIdx = rows.length;
    }
    rows.push(r);
  }
  if (total <= 0) return null;

  // 4. Value area: expand from POC, taking the heavier neighbour each step
  let lo = pocIdx;
  let hi = pocIdx;
  let acc = rows[pocIdx].total;
  const target = total * valueAreaPct;
  while (acc < target && (lo > 0 || hi < rows.length - 1)) {
    const up = hi < rows.length - 1 ? rows[hi + 1].total : -1;
    const dn = lo > 0 ? rows[lo - 1].total : -1;
    if (up >= dn) {
      hi++;
      acc += rows[hi].total;
    } else {
      lo--;
      acc += rows[lo].total;
    }
  }

  return {
    binSize,
    rows,
    maxTotal,
    pocPrice: rows[pocIdx].price + binSize / 2,
    vahPrice: rows[hi].price + binSize,
    valPrice: rows[lo].price,
    totalVolume: total,
    tickShare: tickVol + estVol > 0 ? tickVol / (tickVol + estVol) : 0,
  };
}
