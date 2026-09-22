import { Candle, DepthPriceLevel, MarketTicker, OrderBookState, RawTrade, Timeframe } from '../types/market';

export interface BinanceCallbacks {
  onDepth: (state: OrderBookState) => void;
  onTrade: (trade: RawTrade) => void;
  onTicker: (ticker: MarketTicker) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
}

export class BinanceService {
  private ws: WebSocket | null = null;
  private callbacks: BinanceCallbacks;
  private isDestroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private baseUrl = 'https://fapi.binance.com';
  private wsUrl: string;
  private symbol: string;

  constructor(callbacks: BinanceCallbacks, symbol: string = 'XAUUSDT') {
    this.callbacks = callbacks;
    this.symbol = symbol.toUpperCase();
    const sLower = this.symbol.toLowerCase();
    this.wsUrl = `wss://fstream.binance.com/stream?streams=${sLower}@depth20@100ms/${sLower}@trade/${sLower}@ticker`;
  }

  public connect() {
    this.isDestroyed = false;
    this.callbacks.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        if (this.isDestroyed) return;
        this.callbacks.onStatusChange('connected');
        // Initial depth snapshot & ticker
        this.fetchDepthSnapshot();
        this.fetch24hTicker();
      };

      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        try {
          const payload = JSON.parse(event.data);
          const stream = payload.stream;
          const data = payload.data;

          if (!data) return;

          if (stream.includes('@depth')) {
            this.handleDepth(data);
          } else if (stream.includes('@trade') || stream.includes('@aggTrade')) {
            this.handleTrade(data);
          } else if (stream.includes('@ticker')) {
            this.handleTicker(data);
          }
        } catch (e) {
          console.error('Binance WS parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Binance WS error:', err);
        this.callbacks.onStatusChange('error', 'WebSocket Error');
      };

      this.ws.onclose = () => {
        if (this.isDestroyed) return;
        this.callbacks.onStatusChange('disconnected');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to create Binance WS:', err);
      this.callbacks.onStatusChange('error', String(err));
      this.scheduleReconnect();
    }
  }

  private handleDepth(data: {
    E: number;
    bids?: [string, string][];
    asks?: [string, string][];
    b?: [string, string][];
    a?: [string, string][];
  }) {
    const rawBids = data.bids || data.b || [];
    const rawAsks = data.asks || data.a || [];

    let maxBid = 0;
    let maxAsk = 0;

    const bids: DepthPriceLevel[] = rawBids.map(([p, q]) => {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      if (qty > maxBid) maxBid = qty;
      return { price, qty };
    }).sort((a, b) => b.price - a.price);

    const asks: DepthPriceLevel[] = rawAsks.map(([p, q]) => {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      if (qty > maxAsk) maxAsk = qty;
      return { price, qty };
    }).sort((a, b) => a.price - b.price);

    const bestBid = bids.length > 0 ? bids[0].price : 0;
    const bestAsk = asks.length > 0 ? asks[0].price : 0;

    const bookState: OrderBookState = {
      timestamp: data.E || Date.now(),
      bestBid,
      bestAsk,
      bids,
      asks,
      maxBidQty: maxBid,
      maxAskQty: maxAsk,
    };

    this.callbacks.onDepth(bookState);
    return bookState;
  }

  private handleTrade(data: {
    t?: number; // trade id
    a?: number; // agg trade id
    p?: string; // price
    q?: string; // qty
    T?: number; // timestamp
    m?: boolean; // buyer is maker? true = sell taker, false = buy taker
  }) {
    if (!data || !data.p || !data.q) return;
    const price = parseFloat(data.p);
    const qty = parseFloat(data.q);
    const time = Number(data.T || Date.now());

    // Strict positive finite validation
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    const trade: RawTrade = {
      id: data.t ?? data.a ?? Date.now(),
      time,
      price,
      qty,
      side: data.m ? 'sell' : 'buy', // m: true means buyer was maker, so aggressive taker was SELLER
    };

    this.callbacks.onTrade(trade);
  }

  public async fetch24hTicker(): Promise<MarketTicker | null> {
    try {
      const res = await fetch(`${this.baseUrl}/fapi/v1/ticker/24hr?symbol=${this.symbol}`);
      if (!res.ok) return null;
      const data = await res.json();
      const ticker: MarketTicker = {
        symbol: this.symbol,
        price: parseFloat(data.lastPrice),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        change24h: parseFloat(data.priceChange),
        changePercent24h: parseFloat(data.priceChangePercent),
        timestamp: data.closeTime || Date.now(),
      };
      this.callbacks.onTicker(ticker);
      return ticker;
    } catch (e) {
      console.warn('Failed to fetch 24hr ticker:', e);
      return null;
    }
  }

  private handleTicker(data: {
    c: string; // last price
    h: string; // high 24h
    l: string; // low 24h
    v: string; // volume 24h
    p: string; // price change
    P: string; // price change percent
    E: number;
  }) {
    const ticker: MarketTicker = {
      symbol: this.symbol,
      price: parseFloat(data.c),
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l),
      volume24h: parseFloat(data.v),
      change24h: parseFloat(data.p),
      changePercent24h: parseFloat(data.P),
      timestamp: data.E || Date.now(),
    };

    this.callbacks.onTicker(ticker);
  }

  public async fetchHistoricalKlines(tf: Timeframe, limit: number = 1500): Promise<Candle[]> {
    // Map timeframe to Binance interval
    let interval = '1m';
    if (tf === '3m') interval = '3m';
    else if (tf === '5m') interval = '5m';
    else if (tf === '15m') interval = '15m';
    else if (tf === '1h') interval = '1h';
    else if (tf === '4h') interval = '4h';
    else interval = '1m';

    try {
      const res = await fetch(`${this.baseUrl}/fapi/v1/klines?symbol=${this.symbol}&interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);
      const raw: Array<[number, string, string, string, string, string, ...unknown[]]> = await res.json();

      return raw
        .map((item) => {
          const open = parseFloat(item[1]);
          const high = parseFloat(item[2]);
          const low = parseFloat(item[3]);
          const close = parseFloat(item[4]);
          const volume = parseFloat(item[5]);

          if (
            !Number.isFinite(open) || open <= 0 ||
            !Number.isFinite(close) || close <= 0 ||
            !Number.isFinite(high) || high <= 0 ||
            !Number.isFinite(low) || low <= 0
          ) {
            return null;
          }

          return {
            time: Math.floor(item[0] / 1000),
            open,
            high: Math.max(open, close, high),
            low: Math.max(0.01, Math.min(open, close, low)),
            close,
            volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
          };
        })
        .filter((c): c is Candle => c !== null);
    } catch (e) {
      console.warn('Failed to fetch historical klines:', e);
      return [];
    }
  }

  public async fetchHistoricalTrades(totalLimit: number = 3000): Promise<RawTrade[]> {
    try {
      // First batch: latest 1000 trades
      const res1 = await fetch(`${this.baseUrl}/fapi/v1/aggTrades?symbol=${this.symbol}&limit=1000`);
      if (!res1.ok) return [];
      const batch1: Array<{ a: number; p: string; q: string; T: number; m: boolean }> = await res1.json();
      if (batch1.length === 0) return [];

      let allRaw = [...batch1];

      // Second batch backwards
      if (totalLimit > 1000 && batch1.length > 0) {
        const firstId = batch1[0].a;
        try {
          const res2 = await fetch(`${this.baseUrl}/fapi/v1/aggTrades?symbol=${this.symbol}&limit=1000&fromId=${Math.max(1, firstId - 1000)}`);
          if (res2.ok) {
            const batch2: Array<{ a: number; p: string; q: string; T: number; m: boolean }> = await res2.json();
            const older = batch2.filter((t) => t.a < firstId);
            allRaw = [...older, ...allRaw];

            // Third batch backwards if requested
            if (totalLimit > 2000 && older.length > 0) {
              const earliestId = older[0].a;
              const res3 = await fetch(`${this.baseUrl}/fapi/v1/aggTrades?symbol=${this.symbol}&limit=1000&fromId=${Math.max(1, earliestId - 1000)}`);
              if (res3.ok) {
                const batch3: Array<{ a: number; p: string; q: string; T: number; m: boolean }> = await res3.json();
                const oldest = batch3.filter((t) => t.a < earliestId);
                allRaw = [...oldest, ...allRaw];
              }
            }
          }
        } catch {
          // Ignore secondary batch errors, keep first batch
        }
      }

      const validTrades: RawTrade[] = [];
      for (const item of allRaw) {
        const price = parseFloat(item.p);
        const qty = parseFloat(item.q);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) {
          continue;
        }
        validTrades.push({
          id: item.a,
          time: item.T,
          price,
          qty,
          side: item.m ? 'sell' : 'buy',
        });
      }
      return validTrades;
    } catch (e) {
      console.warn('Failed to fetch historical trades:', e);
      return [];
    }
  }

  public async fetchDepthSnapshot(limit: number = 500): Promise<OrderBookState | null> {
    try {
      const res = await fetch(`${this.baseUrl}/fapi/v1/depth?symbol=${this.symbol}&limit=${limit}`);
      if (!res.ok) return null;
      const data = await res.json();
      return this.handleDepth({
        E: Date.now(),
        bids: data.bids,
        asks: data.asks,
      });
    } catch (e) {
      console.warn('Depth snapshot fetch error:', e);
      return null;
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed) {
        this.connect();
      }
    }, 3000);
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
