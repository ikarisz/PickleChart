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
  // Binance Futures moved ticker/aggTrade/markPrice streams to the /market path;
  // the legacy /stream path still serves depth + trade but never pushes @ticker.
  private marketWs: WebSocket | null = null;
  private marketWsUrl: string;
  private marketReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private symbol: string;

  constructor(callbacks: BinanceCallbacks, symbol: string = 'XAUUSDT') {
    this.callbacks = callbacks;
    this.symbol = symbol.toUpperCase();
    const sLower = this.symbol.toLowerCase();
    this.wsUrl = `wss://fstream.binance.com/stream?streams=${sLower}@depth20@100ms/${sLower}@trade`;
    this.marketWsUrl = `wss://fstream.binance.com/market/stream?streams=${sLower}@ticker`;
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

    if (!this.marketWs) {
      this.connectMarket();
    }
  }

  private connectMarket() {
    if (this.isDestroyed) return;
    try {
      const ws = new WebSocket(this.marketWsUrl);
      this.marketWs = ws;

      ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.data && String(payload.stream).includes('@ticker')) {
            this.handleTicker(payload.data);
          }
        } catch (e) {
          console.error('Binance market WS parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('Binance market WS error:', err);
      };

      ws.onclose = () => {
        if (this.marketWs === ws) this.marketWs = null;
        this.scheduleMarketReconnect();
      };
    } catch (err) {
      console.warn('Failed to create Binance market WS:', err);
      this.marketWs = null;
      this.scheduleMarketReconnect();
    }
  }

  private scheduleMarketReconnect() {
    if (this.isDestroyed || this.marketReconnectTimer) return;
    this.marketReconnectTimer = setTimeout(() => {
      this.marketReconnectTimer = null;
      if (!this.isDestroyed && !this.marketWs) {
        this.connectMarket();
      }
    }, 3000);
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
          const takerBuy = parseFloat(String(item[9])); // taker buy base volume

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
            ...(Number.isFinite(takerBuy) && takerBuy >= 0 && takerBuy <= volume
              ? { buyVolume: takerBuy, sellVolume: volume - takerBuy }
              : {}),
          };
        })
        .filter((c): c is Candle => c !== null);
    } catch (e) {
      console.warn('Failed to fetch historical klines:', e);
      return [];
    }
  }

  // Cached aggTrades history. The first call pages backwards up to `totalLimit`
  // trades (1000 per request); later calls (e.g. timeframe switches) only fetch
  // trades newer than the cache, to stay well inside Binance's REST weight limit.
  private tradeCache: RawTrade[] = [];

  public async fetchHistoricalTrades(totalLimit: number = 3000): Promise<RawTrade[]> {
    type AggTrade = { a: number; p: string; q: string; T: number; m: boolean };
    const url = (params: string) => `${this.baseUrl}/fapi/v1/aggTrades?symbol=${this.symbol}&limit=1000${params}`;
    const toRaw = (items: AggTrade[]): RawTrade[] => {
      const out: RawTrade[] = [];
      for (const item of items) {
        const price = parseFloat(item.p);
        const qty = parseFloat(item.q);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
        out.push({ id: item.a, time: item.T, price, qty, side: item.m ? 'sell' : 'buy' });
      }
      return out;
    };

    try {
      const cacheIsUsable =
        this.tradeCache.length >= Math.min(totalLimit, 1000) &&
        Date.now() - this.tradeCache[this.tradeCache.length - 1].time < 10 * 60_000;

      if (cacheIsUsable) {
        // Top up forwards from the newest cached trade
        for (let page = 0; page < 10; page++) {
          const lastId = Number(this.tradeCache[this.tradeCache.length - 1].id);
          const res = await fetch(url(`&fromId=${lastId + 1}`));
          if (!res.ok) break;
          const batch = toRaw(await res.json());
          if (batch.length === 0) break;
          this.tradeCache.push(...batch);
          if (batch.length < 1000) break;
        }
      } else {
        // Cold start: latest page, then page backwards
        const res1 = await fetch(url(''));
        if (!res1.ok) return [];
        let all = toRaw(await res1.json());
        while (all.length > 0 && all.length < totalLimit) {
          const firstId = Number(all[0].id);
          if (firstId <= 1) break;
          const res = await fetch(url(`&fromId=${Math.max(1, firstId - 1000)}`));
          if (!res.ok) break;
          const older = toRaw(await res.json()).filter((t) => Number(t.id) < firstId);
          if (older.length === 0) break;
          all = [...older, ...all];
        }
        this.tradeCache = all;
      }

      if (this.tradeCache.length > totalLimit) {
        this.tradeCache = this.tradeCache.slice(-totalLimit);
      }
      return [...this.tradeCache];
    } catch (e) {
      console.warn('Failed to fetch historical trades:', e);
      return [...this.tradeCache];
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
    if (this.marketReconnectTimer) {
      clearTimeout(this.marketReconnectTimer);
      this.marketReconnectTimer = null;
    }
    if (this.marketWs) {
      this.marketWs.close();
      this.marketWs = null;
    }
  }
}
