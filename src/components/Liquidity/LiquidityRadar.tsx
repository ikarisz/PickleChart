import React, { useState } from 'react';
import {
  LiquidityPool,
  RestingLimitWall,
  SweptOrderEvent,
} from '../../types/liquidity';
import {
  ShieldAlert,
  Flame,
  CheckCircle2,
  Crosshair,
  TrendingDown,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LiquidityRadarProps {
  limitWalls: RestingLimitWall[];
  liquidityPools: LiquidityPool[];
  sweptEvents: SweptOrderEvent[];
  currentPrice: number;
  symbol?: string;
  onPriceSelect?: (price: number) => void;
  measureToolActive: boolean;
  onToggleMeasureTool: () => void;
}

export const LiquidityRadar: React.FC<LiquidityRadarProps> = ({
  limitWalls,
  liquidityPools,
  sweptEvents,
  currentPrice,
  symbol = 'XAUUSDT',
  onPriceSelect,
  measureToolActive,
  onToggleMeasureTool,
}) => {
  type TabType = 'walls' | 'pools' | 'swept';
  const [activeTab, setActiveTab] = useState<TabType>('swept');
  const [minVolFilter, setMinVolFilter] = useState<number>(1.0);

  // Compute summary stats
  const buyWalls = limitWalls.filter((w) => w.side === 'buy');
  const sellWalls = limitWalls.filter((w) => w.side === 'sell');

  const totalBuyLimitVol = buyWalls.reduce((acc, w) => acc + w.volume, 0);
  const totalSellLimitVol = sellWalls.reduce((acc, w) => acc + w.volume, 0);
  const totalLimitVol = totalBuyLimitVol + totalSellLimitVol;
  const buyRatio = totalLimitVol > 0 ? (totalBuyLimitVol / totalLimitVol) * 100 : 50;

  const totalSweptVol = sweptEvents.reduce((acc, s) => acc + s.volume, 0);
  const activePoolsCount = liquidityPools.filter((p) => !p.isSwept).length;

  // Max volume for relative bar widths
  const maxWallVol = Math.max(1, ...limitWalls.map((w) => w.volume));

  return (
    <div className="flex flex-col h-full bg-[#10141d] select-none font-mono text-[11px] text-slate-200">
      {/* 1. Windows XP Header Toolbar */}
      <div className="px-2 py-1 bg-[#ece9d8] border-b border-[#aca899] flex items-center justify-between font-sans text-xs">
        <div className="flex items-center gap-1.5">
          {/* Rebar Gripper */}
          <div className="flex flex-col gap-[2px] pr-1 py-0.5 opacity-60">
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
            <div className="flex gap-[2px]"><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /><span className="w-[2px] h-[2px] bg-[#808080] border-r border-b border-white" /></div>
          </div>
          <Layers className="w-3.5 h-3.5 text-[#0055ea]" />
          <span className="font-bold text-slate-900 text-xs">
            Liquidity & Sweep
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-[1px] border-t border-l border-[#808080] border-r border-b border-white bg-white text-[#0055ea] font-mono font-bold">
            {symbol} {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : ''}
          </span>
        </div>

        {/* Measure Tool Toggle (XP 3D Button) */}
        <button
          onClick={onToggleMeasureTool}
          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold rounded-[2px] transition-all ${
            measureToolActive
              ? 'bg-[#fbbf24] text-slate-950 border-t border-l border-[#b45309] border-r border-b border-white shadow-inner font-bold'
              : 'bg-[#ece9d8] hover:bg-[#dfdbcc] active:bg-[#d0ccc0] border-t border-l border-white border-r border-b border-[#808080] text-slate-800'
          }`}
          title="Toggle Click & Drag Range Measurement Ruler on Chart"
        >
          <Crosshair className="w-2.5 h-2.5 text-[#0055ea]" />
          <span>{measureToolActive ? 'Measuring...' : 'Measure Tool'}</span>
        </button>
      </div>

      {/* 2. Top Summary Metrics - Windows XP Inset Panels */}
      <div className="p-2 bg-[#ece9d8] border-b border-[#aca899] space-y-1.5 text-[10px] font-sans">
        {/* Limit Order Imbalance Bar */}
        <div>
          <div className="flex justify-between items-center text-slate-700 font-semibold mb-0.5">
            <span className="flex items-center gap-1 text-[#008000]">
              <TrendingUp className="w-3 h-3" /> Buy: {totalBuyLimitVol.toFixed(1)}
            </span>
            <span className="text-slate-600 font-bold">{buyRatio.toFixed(0)}% / {(100 - buyRatio).toFixed(0)}%</span>
            <span className="flex items-center gap-1 text-[#c00000]">
              Sell: {totalSellLimitVol.toFixed(1)} <TrendingDown className="w-3 h-3" />
            </span>
          </div>
          {/* Win32 Sunken Progress Track */}
          <div className="w-full h-3 border-t border-l border-[#808080] border-r border-b border-white bg-white p-[1px] flex overflow-hidden">
            <div
              className="bg-gradient-to-b from-[#5cdb6e] via-[#32cd32] to-[#228b22] h-full transition-all duration-300"
              style={{ width: `${buyRatio}%` }}
            />
            <div
              className="bg-gradient-to-b from-[#ff6b6b] via-[#e63946] to-[#b71c1c] h-full transition-all duration-300"
              style={{ width: `${100 - buyRatio}%` }}
            />
          </div>
        </div>

        {/* Quick Highlights Grid - Win32 Sunken White Panels */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="bg-white p-1 rounded-[1px] border-t border-l border-[#808080] border-r border-b border-white shadow-inner">
            <div className="text-slate-600 flex items-center gap-1 text-[9px] font-semibold">
              <Sparkles className="w-2.5 h-2.5 text-[#d97706]" />
              <span>Swept Volume</span>
            </div>
            <div className="text-xs font-bold text-[#b45309] font-mono mt-0.5">
              {totalSweptVol.toFixed(1)} <span className="text-[9px] text-slate-500 font-normal">Total</span>
            </div>
          </div>
          <div className="bg-white p-1 rounded-[1px] border-t border-l border-[#808080] border-r border-b border-white shadow-inner">
            <div className="text-slate-600 flex items-center gap-1 text-[9px] font-semibold">
              <ShieldAlert className="w-2.5 h-2.5 text-[#0055ea]" />
              <span>Est. SL/TP Pools</span>
            </div>
            <div className="text-xs font-bold text-[#0055ea] font-mono mt-0.5">
              {activePoolsCount} <span className="text-[9px] text-slate-500 font-normal">Active Near</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Windows XP Sub Tabs */}
      <div className="flex items-end bg-[#ece9d8] border-b border-[#919b9c] px-1 pt-1 gap-1 shrink-0 font-sans">
        <button
          onClick={() => setActiveTab('swept')}
          className={`flex-1 py-1 px-1 rounded-t-[3px] text-[10px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'swept'
              ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10'
              : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899]'
          }`}
        >
          <CheckCircle2 className="w-2.5 h-2.5 text-[#008000]" />
          <span>Swept ({sweptEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('walls')}
          className={`flex-1 py-1 px-1 rounded-t-[3px] text-[10px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'walls'
              ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10'
              : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899]'
          }`}
        >
          <Flame className="w-2.5 h-2.5 text-[#d97706]" />
          <span>Walls ({limitWalls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pools')}
          className={`flex-1 py-1 px-1 rounded-t-[3px] text-[10px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'pools'
              ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10'
              : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899]'
          }`}
        >
          <ShieldAlert className="w-2.5 h-2.5 text-[#0055ea]" />
          <span>Pools ({liquidityPools.length})</span>
        </button>
      </div>

      {/* 4. Tab Contents - Windows XP Sunken Win32 ListView */}
      <div className="flex-1 overflow-y-auto bg-white border-t-2 border-l-2 border-[#808080] border-r border-b border-white font-sans text-xs">
        {/* TAB 1: SWEPT ORDERS ("จุดที่ออเดอร์ถูกเก็บไปแล้ว") */}
        {activeTab === 'swept' && (
          <div className="divide-y divide-[#eef0f3]">
            {sweptEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Monitoring live order sweeps...
              </div>
            ) : (
              sweptEvents.map((ev, idx) => {
                const isBuySwept = ev.aggressorSide === 'buy';
                const d = new Date(ev.time);
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onPriceSelect && onPriceSelect(ev.price)}
                    className={`p-2 cursor-pointer transition-colors space-y-1 ${
                      isEven ? 'bg-white hover:bg-[#e8f0fe]' : 'bg-[#f8f9fa] hover:bg-[#e8f0fe]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded-[1px] text-[9px] font-bold border ${
                            isBuySwept
                              ? 'bg-[#ecfdf5] text-[#008000] border-[#86efac]'
                              : 'bg-[#fff1f2] text-[#c00000] border-[#fca5a5]'
                          }`}
                        >
                          {isBuySwept ? 'BUY SWEEP' : 'SELL SWEEP'}
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-[11px]">${ev.price.toFixed(2)}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#b45309] font-bold">
                        {ev.volume.toFixed(1)} <span className="text-slate-600 font-normal">Contracts</span>
                      </span>
                      <span className="text-slate-600">
                        ${ev.notional.toLocaleString()} USDT
                      </span>
                    </div>

                    {/* Market Reaction badge */}
                    <div className="flex items-center justify-between text-[9px] pt-1 border-t border-[#f0eee4]">
                      <span className="text-slate-500 font-sans">Reaction:</span>
                      {ev.reaction === 'absorbed_reversal' ? (
                        <span className="px-1.5 py-0.2 rounded-[1px] bg-[#fef3c7] text-[#92400e] font-semibold border border-[#fde68a]">
                          🛡️ Absorbed & Reversal
                        </span>
                      ) : ev.reaction === 'breakout_continuation' ? (
                        <span className="px-1.5 py-0.2 rounded-[1px] bg-[#e0f2fe] text-[#0369a1] font-semibold border border-[#bae6fd]">
                          🚀 Breakout & Continued
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Analyzing reaction...</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: LIMIT WALLS */}
        {activeTab === 'walls' && (
          <div className="divide-y divide-[#eef0f3]">
            {/* Filter */}
            <div className="px-2 py-1 flex items-center justify-between text-[10px] text-slate-600 bg-[#ece9d8] border-b border-[#aca899] font-sans">
              <span>Min Volume Filter:</span>
              <div className="flex gap-1">
                {[1, 2, 5, 10].map((v) => (
                  <button
                    key={v}
                    onClick={() => setMinVolFilter(v)}
                    className={`px-1.5 py-0.2 rounded-[1px] text-[10px] font-sans ${
                      minVolFilter === v
                        ? 'bg-[#fbbf24] text-slate-950 font-bold border-t border-l border-[#b45309] border-r border-b border-white shadow-inner'
                        : 'bg-[#ece9d8] hover:bg-[#dfdbcc] border-t border-l border-white border-r border-b border-[#808080] text-slate-800'
                    }`}
                  >
                    ≥{v}
                  </button>
                ))}
              </div>
            </div>

            {limitWalls
              .filter((w) => w.volume >= minVolFilter)
              .map((w, idx) => {
                const isBuy = w.side === 'buy';
                const barWidth = Math.min(100, (w.volume / maxWallVol) * 100);
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={`${w.side}-${w.price}-${idx}`}
                    onClick={() => onPriceSelect && onPriceSelect(w.price)}
                    className={`p-2 cursor-pointer transition-colors relative overflow-hidden ${
                      isEven ? 'bg-white hover:bg-[#e8f0fe]' : 'bg-[#f8f9fa] hover:bg-[#e8f0fe]'
                    }`}
                  >
                    {/* Background Progress Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none transition-all ${
                        isBuy ? 'bg-[#86efac]' : 'bg-[#fca5a5]'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isBuy ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                          }`}
                        />
                        <span className="font-bold text-slate-900 font-mono text-[11px]">${w.price.toFixed(2)}</span>
                        <span
                          className={`text-[9px] font-bold px-1 rounded-[1px] border ${
                            isBuy
                              ? 'text-[#008000] bg-[#ecfdf5] border-[#86efac]'
                              : 'text-[#c00000] bg-[#fff1f2] border-[#fca5a5]'
                          }`}
                        >
                          {isBuy ? 'LIMIT BUY' : 'LIMIT SELL'}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`font-bold ${isBuy ? 'text-[#008000]' : 'text-[#c00000]'}`}>
                          {w.volume.toFixed(1)} XAU
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>Dist: {w.distance >= 0 ? `+${w.distance.toFixed(2)}` : w.distance.toFixed(2)} ({w.distancePercent.toFixed(2)}%)</span>
                      <span>${w.notional.toLocaleString()} USDT</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* TAB 3: SL / TP LIQUIDITY POOLS */}
        {activeTab === 'pools' && (
          <div className="divide-y divide-[#eef0f3]">
            {liquidityPools.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-sans">
                Scanning swing highs & lows for SL/TP pools...
              </div>
            ) : (
              liquidityPools.map((pool, idx) => {
                const isBSL = pool.type === 'BSL';
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={pool.id}
                    onClick={() => onPriceSelect && onPriceSelect(pool.price)}
                    className={`p-2 cursor-pointer transition-colors space-y-1 ${
                      pool.isSwept
                        ? 'opacity-60 bg-[#f3f4f6]'
                        : isEven
                        ? 'bg-white hover:bg-[#e8f0fe]'
                        : 'bg-[#f8f9fa] hover:bg-[#e8f0fe]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded-[1px] text-[9px] font-bold border ${
                            isBSL
                              ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                              : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                          }`}
                        >
                          {pool.type}
                        </span>
                        <span className={`font-bold font-mono text-[11px] ${pool.isSwept ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          ${pool.price.toFixed(2)}
                        </span>
                      </div>

                      {pool.isSwept ? (
                        <span className="flex items-center gap-1 text-[9px] font-semibold text-[#008000] bg-[#ecfdf5] px-1.5 py-0.5 rounded-[1px] border border-[#86efac]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          SWEPT
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#b45309] font-bold font-sans">
                          Active Pool
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500 font-sans text-[9px]">{pool.description}</span>
                      <span className="font-semibold text-slate-800">
                        ~{pool.estimatedVolume.toFixed(1)} XAU Stop Pool
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-0.5">
                      <span>Distance: {pool.distance.toFixed(2)} pts</span>
                      {pool.sweptVolume && (
                        <span className="text-[#008000] font-bold">Swept: {pool.sweptVolume.toFixed(1)} XAU</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
