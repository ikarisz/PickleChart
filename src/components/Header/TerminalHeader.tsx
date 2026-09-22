import React from 'react';
import { ASSET_MAP, MarketSymbol, MarketTicker, Timeframe } from '../../types/market';
import { Activity, Volume2, VolumeX, Zap, ChevronDown, Crosshair, Sliders } from 'lucide-react';

interface TerminalHeaderProps {
  symbol: MarketSymbol;
  onSelectSymbol: (s: MarketSymbol) => void;
  timeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  ticker: MarketTicker | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  bigTradeThreshold: number;
  onChangeThreshold: (val: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showLimitWalls?: boolean;
  onToggleLimitWalls?: () => void;
  showSLTPPools?: boolean;
  onToggleSLTPPools?: () => void;
  showSweptMarkers?: boolean;
  onToggleSweptMarkers?: () => void;
  measureToolActive?: boolean;
  onToggleMeasureTool?: () => void;
  onOpenSettings?: () => void;
}

const TIMEFRAMES: Timeframe[] = ['1s', '5s', '15s', '30s', '1m', '3m', '5m', '15m', '1h', '4h'];

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  symbol,
  onSelectSymbol,
  timeframe,
  onSelectTimeframe,
  ticker,
  connectionStatus,
  bigTradeThreshold,
  onChangeThreshold,
  isMuted,
  onToggleMute,
  showLimitWalls = true,
  onToggleLimitWalls,
  showSLTPPools = true,
  onToggleSLTPPools,
  showSweptMarkers = true,
  onToggleSweptMarkers,
  measureToolActive = false,
  onToggleMeasureTool,
  onOpenSettings,
}) => {
  const isPositive = ticker ? ticker.change24h >= 0 : true;
  const currentAsset = ASSET_MAP[symbol] || ASSET_MAP['XAUUSDT'];
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = React.useState(false);

  return (
    <div className="h-10 bg-[#ece9d8] border-b border-[#aca899] px-2 flex items-center justify-between gap-1 select-none text-slate-900 font-sans shadow-sm text-xs shrink-0 relative z-30">
      {/* 1. Left Band: Rebar Grip + Asset Selector + Digital Price Readout */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Rebar Gripper */}
        <div className="flex flex-col justify-center gap-0.5 h-6 px-0.5 cursor-grab opacity-70 shrink-0" title="Toolbar">
          <div className="w-1 h-0.5 bg-white border-b border-[#aca899]" />
          <div className="w-1 h-0.5 bg-white border-b border-[#aca899]" />
          <div className="w-1 h-0.5 bg-white border-b border-[#aca899]" />
        </div>

        {/* Windows XP ComboBox Asset Selector */}
        <div className="relative">
          <button
            onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
            className="flex items-center gap-1.5 bg-white border border-[#7f9db9] rounded-[2px] px-2 py-0.5 text-xs text-slate-900 shadow-[inset_1px_1px_1px_rgba(0,0,0,0.15)] hover:border-[#316ac5] cursor-pointer"
            title="Select Market Asset"
          >
            <span className="font-bold text-[#0055ea] font-mono text-xs">{symbol}</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">({currentAsset.name})</span>
            <div className="w-3.5 h-3.5 rounded-[1px] bg-gradient-to-b from-white to-[#d8d4c4] border border-[#7f9db9] flex items-center justify-center text-slate-700 ml-1">
              <ChevronDown className="w-2.5 h-2.5" />
            </div>
          </button>

          {/* XP Dropdown Popover */}
          {isAssetDropdownOpen && (
            <>
              {/* Click-outside backdrop to dismiss */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAssetDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#ece9d8] border-2 border-[#0055ea] rounded-sm shadow-2xl p-1 z-50 text-slate-900 font-sans">
                <div className="text-[10px] font-bold text-slate-700 px-2 py-1 uppercase bg-[#d8d4c4] border-b border-[#aca899] mb-1 flex items-center justify-between">
                  <span>Select Market Asset</span>
                  <span className="text-[9px] text-slate-500 font-mono font-normal">4 Available</span>
                </div>
                {(Object.keys(ASSET_MAP) as MarketSymbol[]).map((sym) => {
                  const a = ASSET_MAP[sym];
                  const isAct = sym === symbol;
                  return (
                    <button
                      key={sym}
                      onClick={() => {
                        onSelectSymbol(sym);
                        setIsAssetDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[1px] text-left text-xs transition-colors my-0.5 cursor-pointer ${
                        isAct
                          ? 'bg-[#316ac5] text-white font-bold shadow-sm'
                          : 'hover:bg-[#316ac5] hover:text-white text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-white' : 'bg-[#0055ea]'}`} />
                        <span className="font-mono font-bold">{a.symbol}</span>
                      </div>
                      <span className={`text-[10px] ${isAct ? 'text-white/90' : 'text-slate-600'}`}>{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Windows XP Digital LED / Sunken Price Display */}
        {ticker && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0d121c] border-t border-l border-[#808080] border-r border-b border-white rounded-[2px] shadow-inner font-mono text-xs">
            <span className={`font-bold ${isPositive ? 'text-[#34d399]' : 'text-[#fb7185]'}`}>
              ${ticker.price.toFixed(2)}
            </span>
            <span className={`text-[10px] ${isPositive ? 'text-[#34d399]' : 'text-[#fb7185]'}`}>
              {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)} ({isPositive ? '+' : ''}{ticker.changePercent24h.toFixed(2)}%)
            </span>
          </div>
        )}

        {/* 24h High / Low / Vol */}
        {ticker && (
          <div className="hidden 2xl:flex items-center gap-2 text-[10px] text-slate-600 font-sans px-1">
            <span>H: <strong className="text-slate-900">${ticker.high24h.toFixed(2)}</strong></span>
            <span>L: <strong className="text-slate-900">${ticker.low24h.toFixed(2)}</strong></span>
            <span>Vol: <strong className="text-slate-900">{ticker.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
          </div>
        )}
      </div>

      {/* Tool Separator */}
      <div className="h-5 w-[2px] border-l border-[#919b9c] border-r border-white mx-1 shrink-0" />

      {/* 2. Center Band: Windows XP Timeframe Segmented Toolbar */}
      <div className="flex items-center gap-0.5 bg-[#ece9d8] p-0.5 rounded-[2px] border border-[#aca899] shadow-[inset_1px_1px_1px_rgba(0,0,0,0.1)] shrink-0">
        {TIMEFRAMES.map((tf) => {
          const is1s = tf === '1s';
          const isSelected = timeframe === tf;
          return (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-1.5 py-0.5 rounded-[2px] text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-[#ffe8a6] border border-[#0055ea] font-bold text-slate-950 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.25)]'
                  : 'hover:border-[#316ac5] hover:bg-white/80 border border-transparent text-slate-800'
              }`}
              title={is1s ? '1-Second Scalp Timeframe' : `${tf} Timeframe`}
            >
              {is1s ? (
                <span className="flex items-center gap-0.5 text-amber-700 font-bold">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  1s
                </span>
              ) : (
                tf
              )}
            </button>
          );
        })}
      </div>

      {/* Tool Separator */}
      <div className="h-5 w-[2px] border-l border-[#919b9c] border-r border-white mx-1 shrink-0" />

      {/* 3. Right Band: Threshold, Liquidity Tools, Settings & Status */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Big Trade Filter Threshold */}
        <div className="flex items-center gap-1 bg-[#ece9d8] border border-[#aca899] rounded-[2px] px-1.5 py-0.5 text-xs">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-slate-800 hidden xl:inline text-[11px]">Big Trade:</span>
          <select
            value={bigTradeThreshold}
            onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
            className="bg-white border border-[#7f9db9] rounded-[2px] px-1 py-0.2 text-[11px] font-mono text-slate-900 focus:outline-none cursor-pointer"
          >
            {currentAsset.thresholdOptions.map((opt) => (
              <option key={opt} value={opt}>
                &ge; {opt} {currentAsset.baseAsset}
              </option>
            ))}
          </select>
        </div>

        {/* Liquidity Toggles */}
        <div className="flex items-center gap-0.5 bg-[#ece9d8] p-0.5 rounded-[2px] border border-[#aca899]">
          {onToggleMeasureTool && (
            <button
              onClick={onToggleMeasureTool}
              className={`px-1.5 py-0.5 rounded-[2px] text-xs font-sans flex items-center gap-0.5 transition-all ${
                measureToolActive
                  ? 'bg-[#ffe8a6] border border-[#0055ea] font-bold text-slate-950 shadow-inner'
                  : 'hover:border-[#316ac5] hover:bg-white/80 border border-transparent text-slate-800'
              }`}
              title="Range Measurement Tool"
            >
              <Crosshair className="w-3 h-3 text-[#0055ea]" />
              <span className="hidden md:inline">Measure</span>
            </button>
          )}

          {onToggleLimitWalls && (
            <button
              onClick={onToggleLimitWalls}
              className={`px-1.5 py-0.5 rounded-[2px] text-xs font-sans transition-all ${
                showLimitWalls
                  ? 'bg-[#ffe8a6] border border-[#0055ea] font-bold text-slate-950 shadow-inner'
                  : 'hover:border-[#316ac5] hover:bg-white/80 border border-transparent text-slate-700'
              }`}
              title="Toggle Resting Limit Walls"
            >
              Walls
            </button>
          )}

          {onToggleSLTPPools && (
            <button
              onClick={onToggleSLTPPools}
              className={`px-1.5 py-0.5 rounded-[2px] text-xs font-sans transition-all ${
                showSLTPPools
                  ? 'bg-[#ffe8a6] border border-[#0055ea] font-bold text-slate-950 shadow-inner'
                  : 'hover:border-[#316ac5] hover:bg-white/80 border border-transparent text-slate-700'
              }`}
              title="Toggle SL / TP Pools"
            >
              SL/TP
            </button>
          )}

          {onToggleSweptMarkers && (
            <button
              onClick={onToggleSweptMarkers}
              className={`px-1.5 py-0.5 rounded-[2px] text-xs font-sans transition-all ${
                showSweptMarkers
                  ? 'bg-[#ffe8a6] border border-[#0055ea] font-bold text-slate-950 shadow-inner'
                  : 'hover:border-[#316ac5] hover:bg-white/80 border border-transparent text-slate-700'
              }`}
              title="Toggle Swept Orders Markers"
            >
              Swept
            </button>
          )}
        </div>

        {/* Windows XP Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-2 py-0.5 rounded-[2px] text-xs font-bold text-[#003fb5] bg-gradient-to-b from-[#ffffff] via-[#ece9d8] to-[#d8d4c4] hover:from-[#fff7d9] border border-[#0055ea] shadow-sm flex items-center gap-1 active:shadow-inner"
            title="Chart Display Properties (Local-First)"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0055ea]" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* Sound Alert Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1 rounded-[2px] bg-gradient-to-b from-[#ffffff] via-[#ece9d8] to-[#d8d4c4] hover:from-[#fff7d9] border border-[#7f9db9] text-slate-800 shadow-sm active:shadow-inner"
          title={isMuted ? 'Unmute Alerts' : 'Mute Alerts'}
        >
          {!isMuted ? <Volume2 className="w-3.5 h-3.5 text-amber-700" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {/* Feed Badge */}
        <div className="flex items-center gap-1 bg-white border border-[#7f9db9] rounded-[2px] px-1.5 py-0.5 text-[10px] font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="font-bold text-slate-800">Binance</span>
        </div>

        {/* Windows XP Dual-Monitor Connection Status Icon */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 border-t border-l border-[#808080] border-r border-b border-white bg-[#ece9d8] rounded-[2px]"
          title={`Broker Feed: ${connectionStatus}`}
        >
          <div className="relative w-3.5 h-3">
            <div className="absolute top-0 right-0 w-2.5 h-2 bg-[#716f64] border border-[#3b3a34] rounded-[1px] p-[1px]">
              <div className={`w-full h-full ${connectionStatus === 'connected' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
            </div>
            <div className="absolute bottom-0 left-0 w-2.5 h-2 bg-[#716f64] border border-[#3b3a34] rounded-[1px] p-[1px]">
              <div className={`w-full h-full ${connectionStatus === 'connected' ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ef4444]'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
