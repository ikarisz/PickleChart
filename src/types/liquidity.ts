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
  estimatedVolume: number; // estimated stop loss density
  isSwept: boolean;
  sweptAtTime?: number;
  sweptVolume?: number;
  distance: number;
}

export type SweptOrderType = 'limit_buy_swept' | 'limit_sell_swept' | 'bsl_swept' | 'ssl_swept';
export type MarketReaction = 'absorbed_reversal' | 'breakout_continuation' | 'pending';

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
