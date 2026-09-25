import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { XPThemeStyle } from '../../types/settings';
import { DrawingToolType } from '../../types/drawing';
import {
  Minus,
  Square,
  X,
  Sliders,
} from 'lucide-react';

interface XPTitleBarProps {
  symbol: MarketSymbol;
  xpTheme: XPThemeStyle;
  onOpenSettings: () => void;
  onSelectDrawingTool: (tool: DrawingToolType) => void;
  onQuickToggleIndicator: (key: 'ema9' | 'ema21' | 'ema50' | 'ema200' | 'vwap' | 'bollinger' | 'volumeProfile') => void;
  activeIndicators: {
    ema9: boolean;
    ema21: boolean;
    ema50: boolean;
    ema200: boolean;
    vwap: boolean;
    bollinger: boolean;
    volumeProfile: boolean;
  };
  onResetView: () => void;
}

export const XPTitleBar: React.FC<XPTitleBarProps> = ({
  symbol,
  xpTheme,
  onOpenSettings,
  onSelectDrawingTool,
  onQuickToggleIndicator,
  activeIndicators,
  onResetView,
}) => {
  type ActiveMenu = 'file' | 'view' | 'indicators' | 'tools' | 'help' | null;
  const [openMenu, setOpenMenu] = useState<ActiveMenu>(null);

  const getThemeGradient = () => {
    if (xpTheme === 'royale_noir') {
      return 'from-[#1e2025] via-[#2d323b] to-[#1e2025] border-b border-[#3b414d]';
    }
    if (xpTheme === 'metallic') {
      return 'from-[#8e98a5] via-[#b6c0cd] to-[#8e98a5] text-slate-900 border-b border-[#717b88]';
    }
    // Luna Blue
    return 'from-[#0055ea] via-[#2470f5] to-[#0055ea] border-b border-[#003fb5]';
  };

  return (
    <div className="w-full select-none flex flex-col z-30">
      {/* 1. Main Windows XP Title Bar */}
      <div
        className={`h-7 px-2.5 bg-gradient-to-r ${getThemeGradient()} text-white flex items-center justify-between shadow-sm`}
      >
        {/* Left: Cucumber Logo & Title */}
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none drop-shadow-sm select-none">🥒</span>

          <span className="font-bold tracking-wide text-xs drop-shadow-sm font-sans">
            {symbol} Perpetual - PickleChart [Windows XP Edition]
          </span>
        </div>

        {/* Right: XP Window Buttons (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1">
          {/* Minimize */}
          <button
            className="w-5 h-4.5 rounded-sm bg-gradient-to-b from-[#3882f7] to-[#1255cc] hover:brightness-110 active:brightness-90 flex items-center justify-center border border-white/40 shadow-inner text-white"
            title="Minimize"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>

          {/* Maximize */}
          <button
            className="w-5 h-4.5 rounded-sm bg-gradient-to-b from-[#3882f7] to-[#1255cc] hover:brightness-110 active:brightness-90 flex items-center justify-center border border-white/40 shadow-inner text-white"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>

          {/* Close */}
          <button
            className="w-5 h-4.5 rounded-sm bg-gradient-to-b from-[#e81123] to-[#b00f1c] hover:brightness-110 active:brightness-90 flex items-center justify-center border border-white/40 shadow-inner text-white font-bold"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Classic XP Menu Bar (File | View | Indicators | Tools | Settings | Help) */}
      <div className="h-6 bg-[#ece9d8] border-b border-[#aca899] px-2 flex items-center gap-1 text-[11px] text-slate-800 font-sans shadow-sm relative">
        {/* FILE MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            className={`px-2 py-0.5 rounded hover:bg-[#dfdbcc] ${openMenu === 'file' ? 'bg-[#b6c6de] font-semibold' : ''}`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 w-48 bg-[#ece9d8] border border-[#716f64] shadow-xl p-1 z-50 text-slate-900 rounded-sm">
              <button
                onClick={() => {
                  onOpenSettings();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Presets & Settings...</span>
              </button>
              <div className="border-t border-[#aca899] my-1" />
              <button
                onClick={() => {
                  onResetView();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Reset Chart View
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            className={`px-2 py-0.5 rounded hover:bg-[#dfdbcc] ${openMenu === 'view' ? 'bg-[#b6c6de] font-semibold' : ''}`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#ece9d8] border border-[#716f64] shadow-xl p-1 z-50 text-slate-900 rounded-sm">
              <button
                onClick={() => {
                  onResetView();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Reset Zoom & Auto-follow
              </button>
            </div>
          )}
        </div>

        {/* INDICATORS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'indicators' ? null : 'indicators')}
            className={`px-2 py-0.5 rounded hover:bg-[#dfdbcc] ${openMenu === 'indicators' ? 'bg-[#b6c6de] font-semibold' : ''}`}
          >
            Indicators
          </button>
          {openMenu === 'indicators' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#ece9d8] border border-[#716f64] shadow-xl p-1 z-50 text-slate-900 rounded-sm">
              <button
                onClick={() => onQuickToggleIndicator('ema9')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>EMA 9 (Momentum)</span>
                <span>{activeIndicators.ema9 ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('ema21')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>EMA 21 (Short Trend)</span>
                <span>{activeIndicators.ema21 ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('ema50')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>EMA 50 (Mid Trend)</span>
                <span>{activeIndicators.ema50 ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('ema200')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>EMA 200 (Baseline)</span>
                <span>{activeIndicators.ema200 ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('vwap')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>Session VWAP</span>
                <span>{activeIndicators.vwap ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('bollinger')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>Bollinger Bands (20, 2)</span>
                <span>{activeIndicators.bollinger ? '✓' : ''}</span>
              </button>
              <button
                onClick={() => onQuickToggleIndicator('volumeProfile')}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm flex items-center justify-between"
              >
                <span>Volume Profile (Visible Range)</span>
                <span>{activeIndicators.volumeProfile ? '✓' : ''}</span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
            className={`px-2 py-0.5 rounded hover:bg-[#dfdbcc] ${openMenu === 'tools' ? 'bg-[#b6c6de] font-semibold' : ''}`}
          >
            Tools
          </button>
          {openMenu === 'tools' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#ece9d8] border border-[#716f64] shadow-xl p-1 z-50 text-slate-900 rounded-sm">
              <button
                onClick={() => {
                  onSelectDrawingTool('box');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Draw Order Block Box (B)
              </button>
              <button
                onClick={() => {
                  onSelectDrawingTool('trendline');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Draw Trendline (T)
              </button>
              <button
                onClick={() => {
                  onSelectDrawingTool('horizontal_ray');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Draw Horizontal Level (H)
              </button>
              <button
                onClick={() => {
                  onSelectDrawingTool('fibonacci');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Fibonacci Retracement (F)
              </button>
              <button
                onClick={() => {
                  onSelectDrawingTool('measure');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white rounded-sm"
              >
                Range Ruler Measure (M)
              </button>
            </div>
          )}
        </div>

        {/* SETTINGS BUTTON */}
        <button
          onClick={onOpenSettings}
          className="px-2 py-0.5 rounded hover:bg-[#dfdbcc] font-semibold text-blue-900 flex items-center gap-1 ml-1"
        >
          <Sliders className="w-3 h-3 text-amber-700" />
          <span>Chart Properties...</span>
        </button>
      </div>

      {/* Backdrop to close menus on outside click */}
      {openMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenu(null)}
        />
      )}
    </div>
  );
};
