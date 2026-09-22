import { BigTrade, RawTrade } from '../types/market';

export class TradeClusterEngine {
  private rawTrades: RawTrade[] = [];
  private clusters: BigTrade[] = [];
  private threshold: number = 2.0; // Starts at 2.0 contracts
  private activeCluster: {
    id: string | number;
    startTime: number;
    lastTime: number;
    price: number;
    buyQty: number;
    sellQty: number;
  } | null = null;

  constructor(threshold: number = 2.0) {
    this.threshold = threshold;
  }

  public setThreshold(threshold: number): BigTrade[] {
    this.threshold = threshold;
    this.rebuildClusters();
    return this.getBigTrades();
  }

  public getBigTrades(): BigTrade[] {
    return this.clusters;
  }

  public setHistoricalTrades(trades: RawTrade[]): BigTrade[] {
    this.rawTrades = trades.filter((t) => t && Number.isFinite(t.price) && t.price > 0 && Number.isFinite(t.qty) && t.qty > 0);
    this.rebuildClusters();
    return this.getBigTrades();
  }

  public processTrade(trade: RawTrade): BigTrade | null {
    if (!trade || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.qty) || trade.qty <= 0) {
      return null;
    }

    this.rawTrades.push(trade);
    if (this.rawTrades.length > 3000) {
      this.rawTrades.shift();
    }

    const roundedPrice = Math.round(trade.price * 2) / 2; // $0.50 tick bucket
    const clusterWindowMs = 800; // 800ms rolling window
    let updatedOrNewBigTrade: BigTrade | null = null;

    if (
      !this.activeCluster ||
      trade.time - this.activeCluster.startTime > clusterWindowMs ||
      Math.abs(this.activeCluster.price - roundedPrice) > 0.5
    ) {
      // Start a new cluster
      this.activeCluster = {
        id: trade.id,
        startTime: trade.time,
        lastTime: trade.time,
        price: trade.price,
        buyQty: trade.side === 'buy' ? trade.qty : 0,
        sellQty: trade.side === 'sell' ? trade.qty : 0,
      };
    } else {
      // Accumulate into active cluster
      this.activeCluster.lastTime = trade.time;
      if (trade.side === 'buy') {
        this.activeCluster.buyQty += trade.qty;
      } else {
        this.activeCluster.sellQty += trade.qty;
      }
    }

    const totalQty = this.activeCluster.buyQty + this.activeCluster.sellQty;
    if (totalQty >= this.threshold) {
      const radius = Math.max(7, Math.min(38, Math.sqrt(totalQty) * 2.4));
      const notional = this.activeCluster.price * totalQty;

      const bt: BigTrade = {
        id: this.activeCluster.id,
        time: this.activeCluster.lastTime,
        price: this.activeCluster.price,
        qty: totalQty,
        buyQty: this.activeCluster.buyQty,
        sellQty: this.activeCluster.sellQty,
        side: this.activeCluster.buyQty >= this.activeCluster.sellQty ? 'buy' : 'sell',
        notional,
        radius,
        pulseProgress: 1.0,
      };

      // Check if cluster already exists in list (update it)
      const existingIdx = this.clusters.findIndex((c) => c.id === bt.id);
      if (existingIdx >= 0) {
        this.clusters[existingIdx] = bt;
      } else {
        this.clusters.unshift(bt);
        if (this.clusters.length > 300) {
          this.clusters.pop();
        }
      }
      updatedOrNewBigTrade = bt;
    }

    return updatedOrNewBigTrade;
  }

  private rebuildClusters() {
    this.clusters = [];
    if (this.rawTrades.length === 0) return;

    let current: {
      id: string | number;
      startTime: number;
      lastTime: number;
      price: number;
      buyQty: number;
      sellQty: number;
    } | null = null;

    const clusterWindowMs = 800;

    for (const t of this.rawTrades) {
      const roundedPrice = Math.round(t.price * 2) / 2;

      if (!current || t.time - current.startTime > clusterWindowMs || Math.abs(current.price - roundedPrice) > 0.5) {
        if (current) {
          const total = current.buyQty + current.sellQty;
          if (total >= this.threshold) {
            this.clusters.push(this.makeBigTrade(current));
          }
        }
        current = {
          id: t.id,
          startTime: t.time,
          lastTime: t.time,
          price: t.price,
          buyQty: t.side === 'buy' ? t.qty : 0,
          sellQty: t.side === 'sell' ? t.qty : 0,
        };
      } else {
        current.lastTime = t.time;
        if (t.side === 'buy') {
          current.buyQty += t.qty;
        } else {
          current.sellQty += t.qty;
        }
      }
    }

    if (current) {
      const total = current.buyQty + current.sellQty;
      if (total >= this.threshold) {
        this.clusters.push(this.makeBigTrade(current));
      }
    }

    // Sort descending by time
    this.clusters.sort((a, b) => b.time - a.time);
    if (this.clusters.length > 300) {
      this.clusters = this.clusters.slice(0, 300);
    }
  }

  private makeBigTrade(c: {
    id: string | number;
    lastTime: number;
    price: number;
    buyQty: number;
    sellQty: number;
  }): BigTrade {
    const total = c.buyQty + c.sellQty;
    const radius = Math.max(7, Math.min(38, Math.sqrt(total) * 2.4));
    return {
      id: c.id,
      time: c.lastTime,
      price: c.price,
      qty: total,
      buyQty: c.buyQty,
      sellQty: c.sellQty,
      side: c.buyQty >= c.sellQty ? 'buy' : 'sell',
      notional: c.price * total,
      radius,
    };
  }
}
