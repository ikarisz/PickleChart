import React from 'react';
import { ArrowDown, ArrowUp, BarChart2 } from 'lucide-react';
import { Broker } from '../../types/market';

interface OrderFlowStatsProps {
  broker: Broker;
  symbol?: string;
  sessionBuyVolume: number;
  sessionSellVolume: number;
  sessionDelta: number;
  tradeCount: number;
  connectionStatus: string;
  depthCount: number;
}

export const OrderFlowStats: React.FC<OrderFlowStatsProps> = ({
  broker,
  symbol = 'XAUUSDT',
  sessionBuyVolume,
  sessionSellVolume,
  sessionDelta,
  tradeCount,
  connectionStatus,
  depthCount,
}) => {
  const isDeltaPositive = sessionDelta >= 0;
  const unit = symbol.replace('USDT', '');

  return (
    <footer className="h-6 bg-[#ece9d8] border-t border-[#ffffff] shadow-[0_-1px_0_#aca899] px-1 flex items-center gap-1.5 text-[11px] font-sans select-none text-slate-800 shrink-0 z-20">
      {/* Pane 1: Session Delta (CVD) - Sunken Win32 Panel */}
      <div className="border-t border-l border-[#808080] border-r border-b border-white bg-[#ece9d8] px-2 py-0.5 rounded-[1px] flex items-center gap-1.5 shrink-0">
        <BarChart2 className="w-3 h-3 text-[#0055ea]" />
        <span className="font-semibold text-slate-700">Delta (CVD):</span>
        <span
          className={`font-mono font-bold flex items-center gap-0.5 ${
            isDeltaPositive ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {isDeltaPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {isDeltaPositive ? '+' : ''}
          {sessionDelta.toFixed(2)} {unit}
        </span>
      </div>

      {/* Pane 2: Buy & Sell Volume Breakdown */}
      <div className="hidden sm:flex border-t border-l border-[#808080] border-r border-b border-white bg-[#ece9d8] px-2 py-0.5 rounded-[1px] items-center gap-2 shrink-0">
        <span className="text-slate-600">Buy: <strong className="text-emerald-700 font-mono">{sessionBuyVolume.toFixed(2)}</strong></span>
        <span className="text-[#aca899]">|</span>
        <span className="text-slate-600">Sell: <strong className="text-rose-700 font-mono">{sessionSellVolume.toFixed(2)}</strong></span>
      </div>

      {/* Pane 3: Trade Ticks & Depth Updates */}
      <div className="hidden md:flex border-t border-l border-[#808080] border-r border-b border-white bg-[#ece9d8] px-2 py-0.5 rounded-[1px] items-center gap-2 shrink-0">
        <span className="text-slate-600">Ticks: <strong className="font-mono text-slate-900">{tradeCount.toLocaleString()}</strong></span>
        <span className="text-[#aca899]">|</span>
        <span className="text-slate-600">Depth: <strong className="font-mono text-slate-900">{depthCount}</strong></span>
      </div>

      {/* Pane 4: Broker Stream Status */}
      <div className="border-t border-l border-[#808080] border-r border-b border-white bg-[#ece9d8] px-2 py-0.5 rounded-[1px] flex items-center gap-1.5 shrink-0">
        <div className="relative w-3 h-2.5">
          <div className={`w-full h-full rounded-[1px] border border-[#3b3a34] p-[1px] ${connectionStatus === 'connected' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
        </div>
        <span className="capitalize font-semibold text-slate-900">{broker}</span>
        <span className="text-[10px] text-slate-500 font-mono">(100ms stream)</span>
      </div>

      {/* Far Right: Windows XP Classic Diagonal Resize Grip Dots */}
      <div className="ml-auto flex flex-col items-end justify-end w-3 h-3 pr-0.5 pb-0.5 opacity-50 shrink-0" title="Ready">
        <div className="flex gap-0.5"><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /></div>
        <div className="flex gap-0.5"><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /></div>
        <div className="flex gap-0.5"><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /><span className="w-0.5 h-0.5 bg-[#808080] border-r border-b border-white" /></div>
      </div>
    </footer>
  );
};
