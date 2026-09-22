import React from 'react';
import { BigTrade } from '../../types/market';
import { ArrowUpRight, ArrowDownRight, ShieldAlert } from 'lucide-react';

interface BigTradeTapeProps {
  trades: BigTrade[];
  symbol?: string;
  onSelectTrade?: (trade: BigTrade) => void;
}

export const BigTradeTape: React.FC<BigTradeTapeProps> = ({ trades, symbol = 'XAUUSDT', onSelectTrade }) => {
  const unit = symbol.replace('USDT', '');
  // Aggregate stats
  const totalBuyVol = trades.filter((t) => t.side === 'buy').reduce((acc, t) => acc + t.qty, 0);
  const totalSellVol = trades.filter((t) => t.side === 'sell').reduce((acc, t) => acc + t.qty, 0);
  const totalVol = totalBuyVol + totalSellVol || 1;
  const buyPct = Math.round((totalBuyVol / totalVol) * 100);

  return (
    <div className="flex flex-col h-full bg-[#0e121a] border-l border-[#aca899] select-none">
      {/* Windows XP Header Toolbar */}
      <div className="px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] flex items-center justify-between font-sans text-xs">
        <div className="flex items-center gap-1.5">
          {/* Rebar Gripper */}
          <div className="flex flex-col gap-[2px] pr-1 py-0.5 opacity-60">
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
          </div>
          <ShieldAlert className="w-3.5 h-3.5 text-[#0055ea]" />
          <span className="font-bold text-slate-900 text-xs">
            Big Trades Tape
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[1px] border-t border-l border-[#808080] border-r border-b border-white bg-white text-[#d97706] font-bold">
          {trades.length} Hits
        </span>
      </div>

      {/* Whale Ratio Bar - Windows XP Win32 Segmented Progress Bar */}
      <div className="px-2 py-1 border-b border-[#aca899] bg-[#ece9d8] select-none font-sans">
        <div className="flex justify-between text-[10px] font-bold mb-0.5">
          <span className="text-[#008000]">BUY {buyPct}%</span>
          <span className="text-slate-600 font-normal">Whale Ratio</span>
          <span className="text-[#c00000]">SELL {100 - buyPct}%</span>
        </div>
        {/* Inset Sunken Win32 Progress Track */}
        <div className="w-full h-3 border-t border-l border-[#808080] border-r border-b border-white bg-white p-[1px] flex overflow-hidden">
          <div
            className="h-full bg-gradient-to-b from-[#5cdb6e] via-[#32cd32] to-[#228b22] border-r border-[#1a6b1a] transition-all duration-300"
            style={{ width: `${buyPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-b from-[#ff6b6b] via-[#e63946] to-[#b71c1c] transition-all duration-300"
            style={{ width: `${100 - buyPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-0.5">
          <span>{totalBuyVol.toFixed(1)} {unit}</span>
          <span>{totalSellVol.toFixed(1)} {unit}</span>
        </div>
      </div>

      {/* Windows XP Table Column Headers (Win32 ListView Header) */}
      <div className="grid grid-cols-4 px-1 py-0.5 bg-gradient-to-b from-[#ffffff] via-[#ece9d8] to-[#ded9c9] border-b border-[#aca899] text-[10px] font-sans font-bold text-slate-800 shadow-sm select-none">
        <div className="border-r border-[#aca899] pr-1">Time</div>
        <div className="border-r border-[#aca899] px-1">Price ($)</div>
        <div className="text-right border-r border-[#aca899] px-1">Size ({unit})</div>
        <div className="text-right pr-1">Total ($)</div>
      </div>

      {/* Windows XP Sunken Win32 ListView Body */}
      <div className="flex-1 overflow-y-auto bg-white border-t-2 border-l-2 border-[#808080] border-r border-b border-white font-mono text-[11px]">
        {trades.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-sans">
            Listening for big trades matching threshold...
          </div>
        ) : (
          trades.map((t, idx) => {
            const isBuy = t.side === 'buy';
            const d = new Date(t.time);
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            const isFresh = idx === 0;
            const isEven = idx % 2 === 0;

            return (
              <div
                key={`${t.id}-${t.time}`}
                onClick={() => onSelectTrade && onSelectTrade(t)}
                className={`grid grid-cols-4 px-1 py-[3px] items-center border-b border-[#eef0f3] cursor-pointer transition-colors ${
                  isFresh
                    ? isBuy
                      ? 'bg-[#ecfdf5] border-y border-[#a7f3d0]'
                      : 'bg-[#fff1f2] border-y border-[#fecdd3]'
                    : isEven
                    ? 'bg-white hover:bg-[#e8f0fe]'
                    : 'bg-[#f8f9fa] hover:bg-[#e8f0fe]'
                }`}
              >
                {/* Time */}
                <div className="text-slate-500 text-[10px] border-r border-[#ece9d8] pr-1">{timeStr}</div>

                {/* Price */}
                <div className="flex items-center gap-0.5 border-r border-[#ece9d8] px-1">
                  {isBuy ? (
                    <ArrowUpRight className="w-3 h-3 text-[#008000] shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-[#c00000] shrink-0" />
                  )}
                  <span className={`font-bold ${isBuy ? 'text-[#008000]' : 'text-[#c00000]'}`}>
                    {t.price.toFixed(2)}
                  </span>
                </div>

                {/* Size */}
                <div className="text-right font-bold text-slate-900 border-r border-[#ece9d8] px-1">
                  {t.qty.toFixed(3)}
                </div>

                {/* Total Notional USDT */}
                <div className="text-right text-slate-600 text-[10px] pr-1">
                  ${Math.round(t.notional).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
