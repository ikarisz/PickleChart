import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { ChartPreset } from '../../types/settings';
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Power,
} from 'lucide-react';

interface XPStartMenuProps {
  symbol: MarketSymbol;
  onSelectSymbol: (s: MarketSymbol) => void;
  onOpenSettings: () => void;
  onResetView: () => void;
  presets: ChartPreset[];
  onApplyPreset: (p: ChartPreset) => void;
  onOpenLandingPage?: () => void;
}

export const XPStartMenu: React.FC<XPStartMenuProps> = ({
  symbol,
  onSelectSymbol,
  onOpenSettings,
  onResetView,
  presets,
  onApplyPreset,
  onOpenLandingPage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block select-none z-40">
      {/* 1. Classic Windows XP Green Start Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 px-3.5 flex items-center gap-1.5 rounded-tr-lg font-bold text-white shadow-md text-xs italic tracking-wider transition-all border-t border-l border-white/40 ${
          isOpen
            ? 'bg-gradient-to-b from-[#1b6b1b] to-[#124b12] ring-1 ring-white/30'
            : 'bg-gradient-to-b from-[#3c9c3c] via-[#358d35] to-[#256c25] hover:brightness-110 active:brightness-95'
        }`}
        style={{
          textShadow: '1px 1px 1px rgba(0,0,0,0.6)',
        }}
      >
        {/* Cucumber Logo Icon */}
        <span className="text-sm not-italic leading-none drop-shadow-sm">🥒</span>
        <span className="font-extrabold text-[12px]">start</span>
      </button>

      {/* 2. Authentic XP Start Menu Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="absolute bottom-full left-0 mb-0.5 w-80 bg-[#ece9d8] border-2 border-[#0055ea] rounded-t-lg shadow-2xl overflow-hidden font-sans text-xs text-slate-900 z-40 flex flex-col"
            style={{
              boxShadow: '0 -5px 25px rgba(0,0,0,0.6)',
            }}
          >
            {/* Start Menu User Header */}
            <div className="h-14 bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] p-2 flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-md bg-white/20 border-2 border-white/60 flex items-center justify-center text-2xl shadow-inner select-none">
                🥒
              </div>
              <div>
                <div className="font-bold text-sm tracking-wide">PickleChart Pro</div>
                <div className="text-[10px] text-blue-200">PickleChart v2.0</div>
              </div>
            </div>

            {/* Two-Column XP Body */}
            <div className="flex bg-white min-h-64">
              {/* Left Column (White Background: Quick Apps) */}
              <div className="w-44 p-2 space-y-1 border-r border-[#aca899] bg-white">
                {onOpenLandingPage && (
                  <button
                    onClick={() => {
                      onOpenLandingPage();
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-1.5 hover:bg-[#316ac5] hover:text-white rounded flex items-center gap-2 font-medium text-emerald-800"
                  >
                    <span>🥒</span>
                    <span>Welcome / Showcase</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenSettings();
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-[#316ac5] hover:text-white rounded flex items-center gap-2 font-medium"
                >
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Chart Settings</span>
                </button>

                <button
                  onClick={() => {
                    onResetView();
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-1.5 hover:bg-[#316ac5] hover:text-white rounded flex items-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  <span>Reset View</span>
                </button>

                <div className="border-t border-[#aca899] my-1" />

                <div className="text-[10px] font-bold text-slate-400 px-1 uppercase">Switch Asset</div>
                {(['XAUUSDT', 'BTCUSDT', 'QQQUSDT', 'SPYUSDT'] as MarketSymbol[]).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSelectSymbol(sym);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono font-semibold flex items-center justify-between ${
                      symbol === sym ? 'bg-blue-100 text-blue-900 font-bold' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span>{sym}</span>
                    {symbol === sym && <span className="text-[9px] text-blue-600">●</span>}
                  </button>
                ))}
              </div>

              {/* Right Column (Soft Blue Background: Presets & Info) */}
              <div className="flex-1 p-2 bg-[#d3e5fa] space-y-2 text-[11px]">
                <div className="font-bold text-blue-900 flex items-center gap-1 border-b border-blue-300/80 pb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Presets</span>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {presets.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onApplyPreset(p);
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-1 rounded hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[9px] text-slate-500 truncate">{p.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <div className="h-9 bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] px-3 flex items-center justify-between text-white text-[11px]">
              <span className="opacity-80 text-[10px]">Ready for Trading</span>
              <button
                onClick={() => {
                  onResetView();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 hover:underline text-[10px] font-semibold"
              >
                <Power className="w-3 h-3 text-rose-300" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
