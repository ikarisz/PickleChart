import React, { useState, useEffect, useRef } from 'react';
import { OrderBookState, RawTrade } from '../../types/market';
import { Crosshair, Lock, Unlock } from 'lucide-react';

interface DepthOfMarketProps {
  orderBook: OrderBookState | null;
  currentPrice: number;
  recentTrades: RawTrade[];
  symbol?: string;
  onPriceClick?: (price: number) => void;
}

export const DepthOfMarket: React.FC<DepthOfMarketProps> = ({
  orderBook,
  currentPrice,
  recentTrades,
  symbol = 'XAUUSDT',
  onPriceClick,
}) => {
  const [lockedToMarket, setLockedToMarket] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [centerPrice, setCenterPrice] = useState<number>(0);

  // Volume Profile at price tracking (Cumulative matched volume)
  const volumeAtPriceRef = useRef<Map<number, { buy: number; sell: number; total: number }>>(new Map());

  // Reset volume profile on symbol change
  useEffect(() => {
    volumeAtPriceRef.current.clear();
  }, [symbol]);

  // Aggregate trades into volume at price
  useEffect(() => {
    if (recentTrades.length === 0) return;
    const map = volumeAtPriceRef.current;
    for (const t of recentTrades) {
      // Round to 0.50 or 0.10 tick
      const step = symbol.includes('QQQ') || symbol.includes('SPY') ? 0.10 : 0.50;
      const priceBucket = Math.round(t.price / step) * step;
      const cur = map.get(priceBucket) || { buy: 0, sell: 0, total: 0 };
      if (t.side === 'buy') {
        cur.buy += t.qty;
      } else {
        cur.sell += t.qty;
      }
      cur.total += t.qty;
      map.set(priceBucket, cur);
    }
  }, [recentTrades, symbol]);

  // Update center price when locked
  useEffect(() => {
    if (lockedToMarket && currentPrice > 0) {
      setCenterPrice(currentPrice);
    }
  }, [currentPrice, lockedToMarket]);

  if (!orderBook) {
    return (
      <div className="flex flex-col h-full bg-[#12161f] border-l border-slate-800 p-4 text-center text-slate-500 font-mono text-xs justify-center">
        Connecting Real-Time DOM...
      </div>
    );
  }

  // Create lookup maps for bids and asks
  const tickSize = symbol.includes('QQQ') || symbol.includes('SPY') ? 0.10 : (symbol.includes('BTC') ? 1.0 : 0.50);

  const bidMap = new Map<number, number>();
  for (const b of orderBook.bids) {
    const p = Math.round(b.price / tickSize) * tickSize;
    bidMap.set(p, (bidMap.get(p) || 0) + b.qty);
  }

  const askMap = new Map<number, number>();
  for (const a of orderBook.asks) {
    const p = Math.round(a.price / tickSize) * tickSize;
    askMap.set(p, (askMap.get(p) || 0) + a.qty);
  }

  // Generate price ladder rows around centerPrice
  const baseP = centerPrice > 0 ? centerPrice : (orderBook.bestBid || 100);
  const roundedBase = Math.round(baseP / tickSize) * tickSize;
  const numRowsAbove = 24;
  const numRowsBelow = 24;

  const priceRows: number[] = [];
  for (let i = numRowsAbove; i >= -numRowsBelow; i--) {
    const p = Math.round((roundedBase + i * tickSize) * 100) / 100;
    priceRows.push(p);
  }

  const maxDepthQty = Math.max(orderBook.maxBidQty, orderBook.maxAskQty, 10.0);

  const bestBid = orderBook.bestBid;
  const bestAsk = orderBook.bestAsk;
  const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid) : 0;

  return (
    <div className="flex flex-col h-full bg-[#10141d] border-l border-[#aca899] select-none font-mono text-[11px]">
      {/* Windows XP DOM Header / Controls */}
      <div className="px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] flex items-center justify-between font-sans text-xs">
        <div className="flex items-center gap-1.5">
          {/* Rebar Gripper */}
          <div className="flex flex-col gap-[2px] pr-1 py-0.5 opacity-60">
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
          </div>
          <span className="font-bold text-slate-900 text-xs">
            DOM Ladder
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-[1px] border-t border-l border-[#808080] border-r border-b border-white bg-white text-[#0055ea] font-mono font-bold">
            {symbol}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setLockedToMarket(true);
              setCenterPrice(currentPrice);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold rounded-[2px] transition-all ${
              lockedToMarket
                ? 'bg-[#fbbf24] text-slate-950 border-t border-l border-[#b45309] border-r border-b border-white shadow-inner font-bold'
                : 'bg-[#ece9d8] hover:bg-[#dfdbcc] active:bg-[#d0ccc0] border-t border-l border-white border-r border-b border-[#808080] text-slate-800'
            }`}
          >
            {lockedToMarket ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            <span>Lock</span>
          </button>
          <button
            onClick={() => setCenterPrice(currentPrice)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold rounded-[2px] bg-[#ece9d8] hover:bg-[#dfdbcc] active:bg-[#d0ccc0] border-t border-l border-white border-r border-b border-[#808080] text-slate-800 transition-all"
            title="Recenter DOM ladder to current market price"
          >
            <Crosshair className="w-2.5 h-2.5 text-[#0055ea]" />
            <span>Center</span>
          </button>
        </div>
      </div>

      {/* Spread and Best Bid/Ask Display - XP Win32 Sunken Inset Panel */}
      <div className="px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] flex items-center justify-between text-[11px] font-sans">
        <div className="flex items-center gap-1 border-t border-l border-[#808080] border-r border-b border-white bg-white px-2 py-0.5 shadow-inner">
          <span className="text-slate-600 text-[10px] font-semibold">Bid:</span>
          <span className="text-[#008000] font-bold font-mono">${bestBid?.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 border-t border-l border-[#808080] border-r border-b border-white bg-[#ffffe1] px-2 py-0.5 shadow-inner">
          <span className="text-slate-600 text-[10px] font-semibold">Spread:</span>
          <span className="text-[#b45309] font-bold font-mono">${(spread || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 border-t border-l border-[#808080] border-r border-b border-white bg-white px-2 py-0.5 shadow-inner">
          <span className="text-slate-600 text-[10px] font-semibold">Ask:</span>
          <span className="text-[#c00000] font-bold font-mono">${bestAsk?.toFixed(2)}</span>
        </div>
      </div>

      {/* Windows XP Table Column Headers (Win32 ListView Header) */}
      <div className="grid grid-cols-12 px-1 py-0.5 bg-gradient-to-b from-[#ffffff] via-[#ece9d8] to-[#ded9c9] border-b border-[#aca899] text-[10px] font-sans font-bold text-slate-800 shadow-sm select-none">
        <div className="col-span-3 text-right pr-1 border-r border-[#aca899]">Bid Vol</div>
        <div className="col-span-4 text-center px-1 border-r border-[#aca899]">Price ($)</div>
        <div className="col-span-3 text-left pl-1 border-r border-[#aca899]">Ask Vol</div>
        <div className="col-span-2 text-right pr-1">Vol</div>
      </div>

      {/* Windows XP Sunken Win32 ListView Table Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-white border-t-2 border-l-2 border-[#808080] border-r border-b border-white font-mono text-[11px]"
      >
        {priceRows.map((price, rowIdx) => {
          const bidQty = bidMap.get(price) || 0;
          const askQty = askMap.get(price) || 0;
          const isBestBid = bestBid > 0 && Math.abs(price - bestBid) < 0.25;
          const isBestAsk = bestAsk > 0 && Math.abs(price - bestAsk) < 0.25;
          const isCurrentPrice = Math.abs(price - currentPrice) < 0.25;

          const volStats = volumeAtPriceRef.current.get(price);
          const totalVolAtPrice = volStats ? volStats.total : 0;

          const bidBarWidth = Math.min(100, (bidQty / maxDepthQty) * 100);
          const askBarWidth = Math.min(100, (askQty / maxDepthQty) * 100);

          const isEven = rowIdx % 2 === 0;

          return (
            <div
              key={price}
              onClick={() => onPriceClick && onPriceClick(price)}
              className={`grid grid-cols-12 px-1 py-[2px] items-center border-b border-[#eef0f3] cursor-pointer transition-colors ${
                isCurrentPrice
                  ? 'bg-[#ffe8a6] border-y border-[#d4a017] text-slate-950 font-bold shadow-sm'
                  : isBestBid
                  ? 'bg-[#ecfdf5] border-y border-[#a7f3d0]'
                  : isBestAsk
                  ? 'bg-[#fff1f2] border-y border-[#fecdd3]'
                  : isEven
                  ? 'bg-white hover:bg-[#e8f0fe]'
                  : 'bg-[#f8f9fa] hover:bg-[#e8f0fe]'
              }`}
            >
              {/* Bid Column with Depth Bar */}
              <div className="col-span-3 relative h-4 flex items-center justify-end pr-1 border-r border-[#ece9d8]">
                {bidQty > 0 && (
                  <>
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#86efac]/50 rounded-[1px] transition-all duration-100"
                      style={{ width: `${bidBarWidth}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#008000] text-[11px]">
                      {bidQty.toFixed(1)}
                    </span>
                  </>
                )}
              </div>

              {/* Price Column */}
              <div className="col-span-4 text-center font-bold relative flex items-center justify-center border-r border-[#ece9d8]">
                {isBestBid && (
                  <span className="absolute left-1 w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                )}
                {isBestAsk && (
                  <span className="absolute left-1 w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                )}
                <span
                  className={`px-1 rounded-[1px] text-[11px] ${
                    isCurrentPrice
                      ? 'bg-[#0055ea] text-white font-extrabold shadow-sm'
                      : isBestBid
                      ? 'text-[#008000] font-extrabold'
                      : isBestAsk
                      ? 'text-[#c00000] font-extrabold'
                      : 'text-slate-800 font-bold'
                  }`}
                >
                  {price.toFixed(2)}
                </span>
              </div>

              {/* Ask Column with Depth Bar */}
              <div className="col-span-3 relative h-4 flex items-center justify-start pl-1 border-r border-[#ece9d8]">
                {askQty > 0 && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-[#fca5a5]/50 rounded-[1px] transition-all duration-100"
                      style={{ width: `${askBarWidth}%` }}
                    />
                    <span className="relative z-10 font-bold text-[#c00000] text-[11px]">
                      {askQty.toFixed(1)}
                    </span>
                  </>
                )}
              </div>

              {/* Traded Volume Profile at this Price */}
              <div className="col-span-2 text-right pr-1 text-[10px] font-mono">
                {totalVolAtPrice > 0 ? (
                  <span className="text-slate-700 font-semibold">{totalVolAtPrice.toFixed(0)}</span>
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
