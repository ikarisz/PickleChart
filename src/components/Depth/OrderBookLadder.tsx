import React from 'react';
import { OrderBookState } from '../../types/market';

interface OrderBookLadderProps {
  orderBook: OrderBookState | null;
  currentPrice: number;
}

export const OrderBookLadder: React.FC<OrderBookLadderProps> = ({ orderBook, currentPrice }) => {
  if (!orderBook) {
    return (
      <div className="p-4 text-center text-slate-500 text-xs font-mono">
        Loading Order Book...
      </div>
    );
  }

  const spread = orderBook.bestAsk > 0 && orderBook.bestBid > 0 ? orderBook.bestAsk - orderBook.bestBid : 0;
  const spreadPct = orderBook.bestBid > 0 ? (spread / orderBook.bestBid) * 100 : 0;

  // Take top 8 asks (reversed so highest ask is at top) and top 8 bids
  const displayAsks = [...orderBook.asks.slice(0, 8)].reverse();
  const displayBids = orderBook.bids.slice(0, 8);

  const maxQty = Math.max(orderBook.maxAskQty, orderBook.maxBidQty, 1.0);

  return (
    <div className="flex flex-col bg-[#0b0e17] border-t border-slate-800/80 p-2 font-mono text-[11px] select-none">
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase">
        <span>Order Book (L2 Depth)</span>
        <span>Spread: ${spread.toFixed(2)} ({spreadPct.toFixed(3)}%)</span>
      </div>

      {/* Asks (Sells) */}
      <div className="space-y-0.5">
        {displayAsks.map((a, idx) => {
          const depthPercent = Math.min(100, (a.qty / maxQty) * 100);
          return (
            <div key={`ask-${idx}-${a.price}`} className="relative flex justify-between px-1 py-0.5 text-[10px] items-center">
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded-sm transition-all"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-rose-400 font-semibold relative z-10">{a.price.toFixed(2)}</span>
              <span className="text-slate-300 relative z-10">{a.qty.toFixed(3)}</span>
            </div>
          );
        })}
      </div>

      {/* Spread & Current Price Divider */}
      <div className="py-1 px-1 my-1 bg-[#121724] rounded flex items-center justify-between font-bold border border-slate-800">
        <span className="text-amber-400 text-xs">${currentPrice > 0 ? currentPrice.toFixed(2) : '---'}</span>
        <span className="text-[10px] text-slate-400">Mid Price</span>
      </div>

      {/* Bids (Buys) */}
      <div className="space-y-0.5">
        {displayBids.map((b, idx) => {
          const depthPercent = Math.min(100, (b.qty / maxQty) * 100);
          return (
            <div key={`bid-${idx}-${b.price}`} className="relative flex justify-between px-1 py-0.5 text-[10px] items-center">
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded-sm transition-all"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-emerald-400 font-semibold relative z-10">{b.price.toFixed(2)}</span>
              <span className="text-slate-300 relative z-10">{b.qty.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
