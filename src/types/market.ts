export type Broker = 'binance' | 'bybit';

export type MarketSymbol = 'XAUUSDT' | 'QQQUSDT' | 'SPYUSDT' | 'BTCUSDT';

export interface AssetInfo {
  symbol: MarketSymbol;
  name: string;
  badge: string;
  category: string;
  baseAsset: string;
  iconLabel: string;
  colorClass: string;
  bgGradient: string;
  defaultBigTradeThreshold: number;
  thresholdOptions: number[];
  tickSize: number;
  supportedBrokers: Broker[];
}

export const ASSET_MAP: Record<MarketSymbol, AssetInfo> = {
  XAUUSDT: {
    symbol: 'XAUUSDT',
    name: 'Gold Perpetual',
    badge: 'Gold Perp',
    category: 'Precious Metals',
    baseAsset: 'XAU',
    iconLabel: 'Au',
    colorClass: 'text-amber-400',
    bgGradient: 'from-amber-400 to-amber-600',
    defaultBigTradeThreshold: 2.0,
    thresholdOptions: [1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0],
    tickSize: 0.50,
    supportedBrokers: ['binance', 'bybit'],
  },
  QQQUSDT: {
    symbol: 'QQQUSDT',
    name: 'Invesco QQQ (NASDAQ 100)',
    badge: 'NASDAQ 100',
    category: 'Index ETF Perp',
    baseAsset: 'QQQ',
    iconLabel: 'NQ',
    colorClass: 'text-cyan-400',
    bgGradient: 'from-cyan-500 to-blue-600',
    defaultBigTradeThreshold: 10.0,
    thresholdOptions: [2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0],
    tickSize: 0.10,
    supportedBrokers: ['binance'],
  },
  SPYUSDT: {
    symbol: 'SPYUSDT',
    name: 'SPDR S&P 500 ETF',
    badge: 'S&P 500',
    category: 'Index ETF Perp',
    baseAsset: 'SPY',
    iconLabel: 'SP',
    colorClass: 'text-emerald-400',
    bgGradient: 'from-emerald-400 to-teal-600',
    defaultBigTradeThreshold: 10.0,
    thresholdOptions: [2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0],
    tickSize: 0.10,
    supportedBrokers: ['binance'],
  },
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: 'Bitcoin Perpetual',
    badge: 'BTC Crypto',
    category: 'Major Crypto',
    baseAsset: 'BTC',
    iconLabel: '₿',
    colorClass: 'text-orange-400',
    bgGradient: 'from-orange-400 to-amber-600',
    defaultBigTradeThreshold: 5.0,
    thresholdOptions: [1.0, 2.0, 5.0, 10.0, 25.0, 50.0, 100.0],
    tickSize: 1.0,
    supportedBrokers: ['binance', 'bybit'],
  },
};

export type Timeframe = '1s' | '5s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m' | '1h' | '4h';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume?: number;
  sellVolume?: number;
}

export interface RawTrade {
  id: string | number;
  time: number; // ms
  price: number;
  qty: number; // in XAU
  side: 'buy' | 'sell'; // aggressive side
}

export interface BigTrade {
  id: string | number;
  time: number; // ms
  price: number;
  qty: number; // total contracts
  buyQty: number;
  sellQty: number;
  side: 'buy' | 'sell';
  notional: number;
  radius: number;
  pulseProgress?: number;
}

export interface DepthPriceLevel {
  price: number;
  qty: number;
  total?: number;
}

export interface OrderBookState {
  timestamp: number;
  bestBid: number;
  bestAsk: number;
  bids: DepthPriceLevel[];
  asks: DepthPriceLevel[];
  maxBidQty: number;
  maxAskQty: number;
}

export interface HeatmapPriceBucket {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
}

export interface HeatmapColumn {
  time: number; // timestamp in ms
  buckets: HeatmapPriceBucket[];
  bestBid: number;
  bestAsk: number;
}

export type HeatmapPalette = 'inferno' | 'magma' | 'cyberpunk' | 'emerald';

export interface MarketTicker {
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: number;
}

export interface OrderFlowSummary {
  buyVolume: number;
  sellVolume: number;
  delta: number;
  bigTradeCount: number;
  bigBuyVolume: number;
  bigSellVolume: number;
}
