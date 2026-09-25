export type LiquidityPoolType = 'BSL' | 'SSL' | 'TP_CLUSTER';

export interface RestingLimitWall {
  price: number;
  volume: number; // in base asset (e.g. contracts / XAU)
  notional: number; // USDT
  side: 'buy' | 'sell';
  distance: number; // in points ($) from current price
  distancePercent: number; // % from current price
  percentageOfBook: number; // % of total visible depth on this side
  isSignificant: boolean;
}

export interface LiquidityPool {
  id: string;
  price: number;
  type: LiquidityPoolType; // BSL = Buy-Side Liquidity (Short SLs & Breakout Buys), SSL = Sell-Side Liquidity (Long SLs & Breakout Sells)
  description: string;
  time: number; // timestamp of swing creation in ms
  estimatedVolume: number; // volume of the swing bar (proxy for interest at the level, not a measured stop size)
  isSwept: boolean;
  sweptAtTime?: number;
  sweptVolume?: number; // volume traded beyond the level during the sweep bar
  sweptVolumeSource?: 'trades' | 'candle'; // 'candle' = no tick data, whole-bar volume used (upper bound)
  distance: number;
}

export type SweptOrderType = 'limit_buy_swept' | 'limit_sell_swept' | 'bsl_swept' | 'ssl_swept';
// Decided by whichever threshold price hits first after the sweep (see LiquidityEngine):
// breakout = follow-through in the aggressor's direction, reversal = move against it,
// stalled = neither within the evaluation window.
export type MarketReaction = 'absorbed_reversal' | 'breakout_continuation' | 'stalled' | 'pending';

export interface SweptOrderEvent {
  id: string;
  time: number; // ms
  price: number;
  type: SweptOrderType;
  volume: number; // Contracts swept
  notional: number; // USDT
  aggressorSide: 'buy' | 'sell'; // who took the liquidity
  reaction: MarketReaction;
  initialRestingVolume?: number;
  highAfterSweep?: number;
  lowAfterSweep?: number;
  // Key absorption: an absorbed_reversal that is large vs recent sweeps, or several
  // absorptions stacked at the same level (see LiquidityEngine.flagSignificantAbsorption)
  significant?: boolean;
  significanceTags?: string[]; // e.g. ['SSL pool', 'Wall 35 XAU', '×3 stacked 62.1 XAU']
}

export interface RangeMeasurementResult {
  minPrice: number;
  maxPrice: number;
  priceSpan: number;
  pointSpan: number;
  totalRestingBuy: number;
  totalRestingSell: number;
  restingBuyCount: number;
  restingSellCount: number;
  pools: LiquidityPool[];
  totalFilledVolume: number;
  buyFillVolume: number;
  sellFillVolume: number;
  netDelta: number;
  recentSweeps: SweptOrderEvent[];
}

export interface LiquiditySettings {
  showLimitWalls: boolean;
  showSLTPPools: boolean;
  showSweptMarkers: boolean;
  measureToolActive: boolean;
  wallThreshold: number; // minimum contract volume to consider a wall
}
