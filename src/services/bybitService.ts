import { Candle, DepthPriceLevel, MarketTicker, OrderBookState, RawTrade, Timeframe } from '../types/market';

export interface BybitCallbacks {
  onDepth: (state: OrderBookState) => void;
  onTrade: (trade: RawTrade) => void;
  onTicker: (ticker: MarketTicker) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
}

export class BybitService {
  private ws: WebSocket | null = null;
  private callbacks: BybitCallbacks;
  private isDestroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private wsUrl = 'wss://stream.bybit.com/v5/public/linear';
  private baseUrl = 'https://api.bybit.com';

  // In-memory orderbook delta map
  private currentBids: Map<number, number> = new Map();
  private currentAsks: Map<number, number> = new Map();

  constructor(callbacks: BybitCallbacks) {
    this.callbacks = callbacks;
  }

  public connect() {
    this.isDestroyed = false;
    this.callbacks.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        if (this.isDestroyed) return;
        this.callbacks.onStatusChange('connected');

        // Subscribe to topics
        const subMsg = {
          op: 'subscribe',
          args: [
            'orderbook.50.XAUUSDT',
            'publicTrade.XAUUSDT',
            'tickers.XAUUSDT',
          ],
        };
        this.ws?.send(JSON.stringify(subMsg));

        // Start ping keep-alive every 20s
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        try {
          const msg = JSON.parse(event.data);
          const topic = msg.topic;
          const data = msg.data;

          if (!data) return;

          if (topic?.startsWith('orderbook.')) {
            this.handleDepth(msg.type, data, msg.ts);
          } else if (topic?.startsWith('publicTrade.')) {
            this.handleTrades(data);
          } else if (topic?.startsWith('tickers.')) {
            this.handleTicker(data, msg.ts);
          }
        } catch (e) {
          console.error('Bybit WS parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Bybit WS error:', err);
        this.callbacks.onStatusChange('error', 'Bybit WS Error');
      };

      this.ws.onclose = () => {
        if (this.isDestroyed) return;
        this.callbacks.onStatusChange('disconnected');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to create Bybit WS:', err);
      this.callbacks.onStatusChange('error', String(err));
      this.scheduleReconnect();
    }
  }

  private handleDepth(type: string, data: { b?: [string, string][]; a?: [string, string][] }, ts: number) {
    if (type === 'snapshot') {
      this.currentBids.clear();
      this.currentAsks.clear();
    }

    if (data.b) {
      for (const [pStr, qStr] of data.b) {
        const price = parseFloat(pStr);
        const qty = parseFloat(qStr);
        if (qty === 0) {
          this.currentBids.delete(price);
        } else {
          this.currentBids.set(price, qty);
        }
      }
    }

    if (data.a) {
      for (const [pStr, qStr] of data.a) {
        const price = parseFloat(pStr);
        const qty = parseFloat(qStr);
        if (qty === 0) {
          this.currentAsks.delete(price);
        } else {
          this.currentAsks.set(price, qty);
        }
      }
    }

    let maxBid = 0;
    let maxAsk = 0;

    const bids: DepthPriceLevel[] = Array.from(this.currentBids.entries())
      .map(([price, qty]) => {
        if (qty > maxBid) maxBid = qty;
        return { price, qty };
      })
      .sort((a, b) => b.price - a.price)
      .slice(0, 30);

    const asks: DepthPriceLevel[] = Array.from(this.currentAsks.entries())
      .map(([price, qty]) => {
        if (qty > maxAsk) maxAsk = qty;
        return { price, qty };
      })
      .sort((a, b) => a.price - b.price)
      .slice(0, 30);

    const bestBid = bids.length > 0 ? bids[0].price : 0;
    const bestAsk = asks.length > 0 ? asks[0].price : 0;

    const bookState: OrderBookState = {
      timestamp: ts || Date.now(),
      bestBid,
      bestAsk,
      bids,
      asks,
      maxBidQty: maxBid,
      maxAskQty: maxAsk,
    };

    this.callbacks.onDepth(bookState);
  }

  private handleTrades(data: Array<{ i: string; T: number; p: string; v: string; S: 'Buy' | 'Sell' }>) {
    if (!Array.isArray(data)) return;
    for (const item of data) {
      if (!item || !item.p || !item.v) continue;
      const price = parseFloat(item.p);
      const qty = parseFloat(item.v);
      const time = Number(item.T || Date.now());

      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      const trade: RawTrade = {
        id: item.i || String(Date.now()),
        time,
        price,
        qty,
        side: item.S === 'Buy' ? 'buy' : 'sell',
      };
      this.callbacks.onTrade(trade);
    }
  }

  private handleTicker(
    data: {
      lastPrice?: string;
      highPrice24h?: string;
      lowPrice24h?: string;
      volume24h?: string;
      price24hPcnt?: string;
    },
    ts: number
  ) {
    if (!data.lastPrice) return;
    const price = parseFloat(data.lastPrice);
    const high = data.highPrice24h ? parseFloat(data.highPrice24h) : price;
    const low = data.lowPrice24h ? parseFloat(data.lowPrice24h) : price;
    const vol = data.volume24h ? parseFloat(data.volume24h) : 0;
    const changePct = data.price24hPcnt ? parseFloat(data.price24hPcnt) * 100 : 0;

    const ticker: MarketTicker = {
      symbol: 'XAUUSDT',
      price,
      high24h: high,
      low24h: low,
      volume24h: vol,
      change24h: price * (changePct / 100),
      changePercent24h: changePct,
      timestamp: ts || Date.now(),
    };

    this.callbacks.onTicker(ticker);
  }

  public async fetchHistoricalKlines(tf: Timeframe, limit: number = 300): Promise<Candle[]> {
    let interval = '1';
    if (tf === '3m') interval = '3';
    else if (tf === '5m') interval = '5';
    else if (tf === '15m') interval = '15';
    else if (tf === '1h') interval = '60';
    else if (tf === '4h') interval = '240';
    else interval = '1';

    try {
      const res = await fetch(`${this.baseUrl}/v5/market/kline?category=linear&symbol=XAUUSDT&interval=${interval}&limit=${limit}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (json.retCode !== 0 || !json.result?.list) return [];

      const list: Array<[string, string, string, string, string, string, string]> = json.result.list;
      return list
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
            time: Math.floor(parseInt(item[0]) / 1000),
            open,
            high: Math.max(open, close, high),
            low: Math.max(0.01, Math.min(open, close, low)),
            close,
            volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
          };
        })
        .filter((c): c is Candle => c !== null)
        .sort((a, b) => a.time - b.time);
    } catch (e) {
      console.warn('Bybit fetch klines error:', e);
      return [];
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
