import { useState, useEffect, useRef, useMemo } from 'react';
import { ASSET_MAP, BigTrade, Broker, Candle, MarketSymbol, MarketTicker, OrderBookState, RawTrade, Timeframe } from './types/market';
import { LiquidityPool, RestingLimitWall, SweptOrderEvent } from './types/liquidity';
import { BinanceService } from './services/binanceService';
import { CandleAggregator, isSubMinute } from './services/candleAggregator';
import { TradeClusterEngine } from './services/tradeClusterEngine';
import { LiquidityEngine } from './services/liquidityEngine';
import { audioAlertService } from './services/audioAlert';
import { TerminalHeader } from './components/Header/TerminalHeader';
import { CanvasChart } from './components/Chart/CanvasChart';
import { BigTradeTape } from './components/BigTrades/BigTradeTape';
import { DepthOfMarket } from './components/DOM/DepthOfMarket';
import { LiquidityRadar } from './components/Liquidity/LiquidityRadar';
import { OrderFlowStats } from './components/OrderFlow/OrderFlowStats';
import { XPTitleBar } from './components/XP/XPTitleBar';
import { XPStartMenu } from './components/XP/XPStartMenu';
import { ChartSettingsModal } from './components/Settings/ChartSettingsModal';
import { SettingsStorage } from './services/settingsStorage';
import { ChartAppearanceSettings, ChartPreset } from './types/settings';
import { DrawingItem, DrawingToolType } from './types/drawing';

export function App() {
  const [symbol, setSymbol] = useState<MarketSymbol>('XAUUSDT');
  const [broker] = useState<Broker>('binance');
  const [timeframe, setTimeframe] = useState<Timeframe>('1s');
  const [ticker, setTicker] = useState<MarketTicker | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [bigTrades, setBigTrades] = useState<BigTrade[]>([]);
  const [recentTrades, setRecentTrades] = useState<RawTrade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookState | null>(null);

  // Local-First Chart Appearance, Drawings & Presets State
  const [settings, setSettings] = useState<ChartAppearanceSettings>(() => SettingsStorage.loadSettings());
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => SettingsStorage.loadDrawings());
  const [presets, setPresets] = useState<ChartPreset[]>(() => SettingsStorage.loadPresets());
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('select');
  const [drawingColor, setDrawingColor] = useState<string>('#f59e0b');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Big Trade and Audio Settings
  const [bigTradeThreshold, setBigTradeThreshold] = useState<number>(2.0); // Starts at 2.0 contracts
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Liquidity Tool Settings
  const [showLimitWalls, setShowLimitWalls] = useState<boolean>(true);
  const [showSLTPPools, setShowSLTPPools] = useState<boolean>(true);
  const [showSweptMarkers, setShowSweptMarkers] = useState<boolean>(true);
  const [measureToolActive, setMeasureToolActive] = useState<boolean>(false);

  // Liquidity Data
  const [limitWalls, setLimitWalls] = useState<RestingLimitWall[]>([]);
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [sweptEvents, setSweptEvents] = useState<SweptOrderEvent[]>([]);

  // Panel View Mode: 'split' | 'dom' | 'tape' | 'liquidity'
  const [panelView, setPanelView] = useState<'split' | 'dom' | 'tape' | 'liquidity'>('split');

  // Order Flow metrics
  const [sessionBuyVol, setSessionBuyVol] = useState<number>(0);
  const [sessionSellVol, setSessionSellVol] = useState<number>(0);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [depthCount, setDepthCount] = useState<number>(0);
  const [dataRevision, setDataRevision] = useState(0);

  // Engines
  const liquidityEngine = useMemo(() => new LiquidityEngine(0.50), []);
  const clusterEngineRef = useRef<TradeClusterEngine>(new TradeClusterEngine(2.0));
  const thresholdRef = useRef<number>(2.0);
  const aggregatorRef = useRef<CandleAggregator | null>(null);
  const activeServiceRef = useRef<BinanceService | null>(null);

  // High-performance micro-batching buffer refs (prevents UI freeze under 1000+ trades/sec)
  const pendingRecentTradesRef = useRef<RawTrade[]>([]);
  const pendingBuyVolRef = useRef<number>(0);
  const pendingSellVolRef = useRef<number>(0);
  const pendingTradeCountRef = useRef<number>(0);
  const pendingCandlesRef = useRef<Candle[]>([]);
  const hasPendingCandlesRef = useRef<boolean>(false);
  const hasPendingBigTradesRef = useRef<boolean>(false);
  const hasPendingLiquidityRef = useRef<boolean>(false);

  // Initialize Candle Aggregator
  useEffect(() => {
    aggregatorRef.current = new CandleAggregator(timeframe, (updatedCandles) => {
      pendingCandlesRef.current = updatedCandles;
      hasPendingCandlesRef.current = true;
      liquidityEngine.processCandles(updatedCandles);
      hasPendingLiquidityRef.current = true;
    });
  }, [liquidityEngine]);

  // Micro-batch flush timer: updates React state at smooth 20 FPS (every 50ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasPendingCandlesRef.current) {
        hasPendingCandlesRef.current = false;
        setCandles([...pendingCandlesRef.current]);
      }
      if (hasPendingBigTradesRef.current) {
        hasPendingBigTradesRef.current = false;
        setBigTrades([...clusterEngineRef.current.getBigTrades()]);
      }
      if (hasPendingLiquidityRef.current) {
        hasPendingLiquidityRef.current = false;
        setLimitWalls([...liquidityEngine.getLimitWalls()]);
        setLiquidityPools([...liquidityEngine.getLiquidityPools()]);
        setSweptEvents([...liquidityEngine.getSweptEvents()]);
      }
      if (pendingRecentTradesRef.current.length > 0) {
        const batch = pendingRecentTradesRef.current;
        pendingRecentTradesRef.current = [];
        setRecentTrades((prev) => [...batch, ...prev].slice(0, 250));
      }
      if (pendingBuyVolRef.current > 0) {
        const v = pendingBuyVolRef.current;
        pendingBuyVolRef.current = 0;
        setSessionBuyVol((prev) => prev + v);
      }
      if (pendingSellVolRef.current > 0) {
        const v = pendingSellVolRef.current;
        pendingSellVolRef.current = 0;
        setSessionSellVol((prev) => prev + v);
      }
      if (pendingTradeCountRef.current > 0) {
        const c = pendingTradeCountRef.current;
        pendingTradeCountRef.current = 0;
        setTradeCount((prev) => prev + c);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [liquidityEngine]);

  // Update threshold in cluster engine
  const handleThresholdChange = (val: number) => {
    thresholdRef.current = val;
    setBigTradeThreshold(val);
    const updated = clusterEngineRef.current.setThreshold(val);
    setBigTrades([...updated]);
  };

  // Switch active asset (Gold, NASDAQ QQQ, S&P 500, etc.)
  const handleSelectSymbol = (newSymbol: MarketSymbol) => {
    if (newSymbol === symbol) return;
    setSymbol(newSymbol);
    const asset = ASSET_MAP[newSymbol];
    if (asset) {
      handleThresholdChange(asset.defaultBigTradeThreshold);
      liquidityEngine.setTickSize(asset.tickSize);
    }
  };

  // Load historical candles and load historical trade balls
  useEffect(() => {
    if (!aggregatorRef.current) return;
    aggregatorRef.current.setTimeframe(timeframe);

    const loadData = async () => {
      if (!activeServiceRef.current) return;

      let loadedCandles: Candle[] = [];
      let loadedTrades: RawTrade[] = [];

      if (isSubMinute(timeframe)) {
        // 1. Fetch 3000 multi-batch trades (high resolution tick history)
        const trades = await activeServiceRef.current.fetchHistoricalTrades(3000);
        loadedTrades = trades;
        const tradeCandles = CandleAggregator.aggregateTrades(trades, timeframe);

        // 2. Also fetch 1m klines (prior 15-20 minutes)
        const klines1m = await activeServiceRef.current.fetchHistoricalKlines('1m', 1500);

        // 3. Synthesize cleanly into uniform sub-minute candles
        loadedCandles = CandleAggregator.mergeKlinesWithSubMinute(klines1m, tradeCandles, timeframe);

        const clusters = clusterEngineRef.current.setHistoricalTrades(trades);
        setBigTrades([...clusters]);
        setRecentTrades(trades.slice(0, 250));
      } else {
        // Standard timeframes: fetch up to 1500 historical candles (25 hours to 2+ weeks)
        loadedCandles = await activeServiceRef.current.fetchHistoricalKlines(timeframe, 1500);
        const trades = await activeServiceRef.current.fetchHistoricalTrades(3000);
        loadedTrades = trades;
        const clusters = clusterEngineRef.current.setHistoricalTrades(trades);
        setBigTrades([...clusters]);
        setRecentTrades(trades.slice(0, 250));
      }

      let initialBook: OrderBookState | null = orderBook;
      const deep = await activeServiceRef.current.fetchDepthSnapshot(500);
      if (deep) {
        initialBook = deep;
        setOrderBook(deep);
      }

      if (loadedCandles.length > 0) {
        aggregatorRef.current?.setCandles(loadedCandles);
        setCandles([...loadedCandles]);
        liquidityEngine.processCandles(loadedCandles);
        if (loadedTrades.length > 0) {
          liquidityEngine.setHistoricalTrades(loadedTrades);
        }
        if (initialBook) {
          liquidityEngine.processOrderBook(initialBook);
        }
        hasPendingLiquidityRef.current = true;
      }
    };

    loadData();
  }, [symbol, timeframe, broker, dataRevision, liquidityEngine]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioAlertService.setMuted(next);
  };

  // Connect to Broker Data Stream (Real-Time WebSocket)
  useEffect(() => {
    setBigTrades([]);
    setRecentTrades([]);
    setSessionBuyVol(0);
    setSessionSellVol(0);
    setTradeCount(0);
    setDepthCount(0);

    const onDepth = (state: OrderBookState) => {
      setOrderBook(state);
      liquidityEngine.processOrderBook(state);
      hasPendingLiquidityRef.current = true;
      setDepthCount((prev) => prev + 1);
    };

    const onTrade = (trade: RawTrade) => {
      // 1. Live candle aggregation (synchronous in-memory)
      aggregatorRef.current?.processTrade(trade);

      // 2. Consume / reduce resting limit orders at trade price & detect order sweeps
      liquidityEngine.processTrade(trade);
      hasPendingLiquidityRef.current = true;

      // 3. DOM volume profile buffer
      pendingRecentTradesRef.current.unshift(trade);

      // 4. Update volume metrics buffer
      if (trade.side === 'buy') {
        pendingBuyVolRef.current += trade.qty;
      } else {
        pendingSellVolRef.current += trade.qty;
      }
      pendingTradeCountRef.current += 1;

      // 5. Process trade in Cluster Engine -> produces 3D Big Trade Spheres (Balls)
      const bt = clusterEngineRef.current.processTrade(trade);
      if (bt) {
        hasPendingBigTradesRef.current = true;
        if (bt.qty >= thresholdRef.current) {
          audioAlertService.playBigTradeChime(trade.side, bt.notional);
        }
      }
    };

    const onTicker = (tick: MarketTicker) => {
      setTicker(tick);
    };

    const onStatusChange = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      setConnectionStatus(status);
    };

    const service = new BinanceService({ onDepth, onTrade, onTicker, onStatusChange }, symbol);
    activeServiceRef.current = service;
    service.connect();
    setDataRevision((revision) => revision + 1);

    return () => {
      if (activeServiceRef.current) {
        activeServiceRef.current.disconnect();
        activeServiceRef.current = null;
      }
    };
  }, [symbol, broker, liquidityEngine]);

  // XP Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateDrawings = (newDrawings: DrawingItem[]) => {
    setDrawings(newDrawings);
    SettingsStorage.saveDrawings(newDrawings);
  };

  const handleUpdateSettings = (newSettings: ChartAppearanceSettings) => {
    setSettings(newSettings);
    SettingsStorage.saveSettings(newSettings);
  };

  const handleApplyPreset = (preset: ChartPreset) => {
    handleUpdateSettings(preset.settings);
  };

  const handleRefreshPresets = () => {
    setPresets(SettingsStorage.loadPresets());
  };

  const handleQuickToggleIndicator = (key: 'ema9' | 'ema21' | 'ema50' | 'ema200' | 'vwap' | 'bollinger') => {
    const next: ChartAppearanceSettings = {
      ...settings,
      indicators: {
        ...settings.indicators,
        [key]: {
          ...settings.indicators[key],
          enabled: !settings.indicators[key].enabled,
        },
      },
    };
    handleUpdateSettings(next);
  };

  const handleResetView = () => {
    setResetViewTrigger(Date.now());
  };

  const getThemeFrameClass = () => {
    if (settings.xpTheme === 'royale_noir') {
      return {
        desktop: 'bg-[#181a20]',
        windowBorder: 'border-[#3b414d]',
        taskbar: 'bg-gradient-to-r from-[#1c1e24] via-[#2a2d36] to-[#1c1e24] border-t border-[#3b414d]',
        activeTask: 'bg-[#22252c] text-white border-t border-l border-black/60 border-r border-b border-white/20',
      };
    }
    if (settings.xpTheme === 'metallic') {
      return {
        desktop: 'bg-[#2e3742]',
        windowBorder: 'border-[#717b88]',
        taskbar: 'bg-gradient-to-r from-[#8e98a5] via-[#b6c0cd] to-[#8e98a5] border-t border-[#717b88] text-slate-900',
        activeTask: 'bg-[#c8d1dc] text-slate-900 border-t border-l border-black/40 border-r border-b border-white/40',
      };
    }
    // Luna Blue
    return {
      desktop: 'bg-[#004e98]',
      windowBorder: 'border-[#0055ea]',
      taskbar: 'bg-gradient-to-r from-[#1f42b3] via-[#245edb] to-[#193a9d] border-t border-[#3b6fe8]',
      activeTask: 'bg-[#163894] text-white border-t border-l border-black/60 border-r border-b border-white/20',
    };
  };

  const themeClasses = getThemeFrameClass();
  const currentPrice = ticker ? ticker.price : (orderBook?.bestBid || 0);

  return (
    <div className={`w-screen h-screen ${themeClasses.desktop} flex flex-col p-1 sm:p-1.5 overflow-hidden select-none font-sans text-slate-200`}>
      {/* 1. Main Windows XP Application Window Frame */}
      <div className={`flex-1 flex flex-col rounded-t-lg border-2 ${themeClasses.windowBorder} shadow-2xl overflow-hidden bg-[#0d1117] min-h-0`}>
        {/* XP Titlebar & Classic Menu Bar */}
        <XPTitleBar
          symbol={symbol}
          xpTheme={settings.xpTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectDrawingTool={setActiveDrawingTool}
          onQuickToggleIndicator={handleQuickToggleIndicator}
          activeIndicators={{
            ema9: settings.indicators.ema9.enabled,
            ema21: settings.indicators.ema21.enabled,
            ema50: settings.indicators.ema50.enabled,
            ema200: settings.indicators.ema200.enabled,
            vwap: settings.indicators.vwap.enabled,
            bollinger: settings.indicators.bollinger.enabled,
          }}
          onResetView={handleResetView}
          onSelectSymbol={handleSelectSymbol}
        />

        {/* PickleChart Terminal Header */}
        <TerminalHeader
          symbol={symbol}
          onSelectSymbol={handleSelectSymbol}
          timeframe={timeframe}
          onSelectTimeframe={setTimeframe}
          ticker={ticker}
          connectionStatus={connectionStatus}
          bigTradeThreshold={bigTradeThreshold}
          onChangeThreshold={handleThresholdChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          showLimitWalls={showLimitWalls}
          onToggleLimitWalls={() => setShowLimitWalls(!showLimitWalls)}
          showSLTPPools={showSLTPPools}
          onToggleSLTPPools={() => setShowSLTPPools(!showSLTPPools)}
          showSweptMarkers={showSweptMarkers}
          onToggleSweptMarkers={() => setShowSweptMarkers(!showSweptMarkers)}
          measureToolActive={measureToolActive}
          onToggleMeasureTool={() => setMeasureToolActive(!measureToolActive)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Split Chart & Trading Sidebar Workspace */}
        <div className="flex-1 flex flex-row overflow-hidden w-full h-full min-h-0">
          {/* High-Performance Canvas Chart */}
          <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-[#11151c]">
            <CanvasChart
              candles={candles}
              bigTrades={bigTrades}
              orderBook={orderBook}
              timeframe={timeframe}
              currentPrice={currentPrice}
              limitWalls={limitWalls}
              liquidityPools={liquidityPools}
              sweptEvents={sweptEvents}
              showLimitWalls={showLimitWalls}
              showSLTPPools={showSLTPPools}
              showSweptMarkers={showSweptMarkers}
              measureToolActive={measureToolActive}
              liquidityEngine={liquidityEngine}
              onToggleMeasureTool={() => setMeasureToolActive(!measureToolActive)}
              settings={settings}
              drawings={drawings}
              onUpdateDrawings={handleUpdateDrawings}
              activeDrawingTool={activeDrawingTool}
              onSelectDrawingTool={setActiveDrawingTool}
              drawingColor={drawingColor}
              onDrawingColorChange={setDrawingColor}
              resetViewTrigger={resetViewTrigger}
            />
          </main>

          {/* Right Side: DOM Ladder, Tape & Liquidity Radar */}
          <aside className="w-80 shrink-0 h-full flex flex-col border-l border-[#aca899] bg-[#ece9d8] z-20">
            {/* Windows XP Property Sheet Tabs */}
            <div className="flex items-end bg-[#ece9d8] border-b border-[#919b9c] px-1.5 pt-1.5 gap-1 shrink-0 select-none">
              <button
                onClick={() => setPanelView('split')}
                className={`py-1 px-3 rounded-t-[3px] text-[11px] font-sans transition-all flex items-center gap-1 ${
                  panelView === 'split'
                    ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]'
                    : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899] mb-0'
                }`}
              >
                <span>Split</span>
              </button>
              <button
                onClick={() => setPanelView('liquidity')}
                className={`py-1 px-2.5 rounded-t-[3px] text-[11px] font-sans transition-all flex items-center gap-1 ${
                  panelView === 'liquidity'
                    ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]'
                    : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899] mb-0'
                }`}
                title="Liquidity Radar & Swept Orders Log"
              >
                <span>Liquidity</span>
                {sweptEvents.length > 0 && (
                  <span className={`text-[10px] ${panelView === 'liquidity' ? 'text-[#0055ea] font-bold' : 'text-slate-600'}`}>
                    ({sweptEvents.length})
                  </span>
                )}
              </button>
              <button
                onClick={() => setPanelView('dom')}
                className={`py-1 px-3 rounded-t-[3px] text-[11px] font-sans transition-all flex items-center gap-1 ${
                  panelView === 'dom'
                    ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]'
                    : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899] mb-0'
                }`}
              >
                <span>DOM</span>
              </button>
              <button
                onClick={() => setPanelView('tape')}
                className={`py-1 px-2.5 rounded-t-[3px] text-[11px] font-sans transition-all flex items-center gap-1 ${
                  panelView === 'tape'
                    ? 'bg-[#ece9d8] text-black font-bold border-t-2 border-t-[#0055ea] border-x border-[#919b9c] -mb-[1px] z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.08)]'
                    : 'bg-[#dfdbcc] hover:bg-[#eae7d8] text-[#333333] border-t border-x border-[#aca899] mb-0'
                }`}
              >
                <span>Trades</span>
                {bigTrades.length > 0 && (
                  <span className={`text-[10px] ${panelView === 'tape' ? 'text-[#d97706] font-bold' : 'text-slate-600'}`}>
                    ({bigTrades.length})
                  </span>
                )}
              </button>
            </div>

            {/* Panel Body */}
            {panelView === 'split' && (
              <>
                <div className="flex-1 overflow-hidden border-b border-[#aca899]">
                  <DepthOfMarket
                    orderBook={orderBook}
                    currentPrice={currentPrice}
                    recentTrades={recentTrades}
                    symbol={symbol}
                  />
                </div>
                <div className="h-64 overflow-hidden">
                  <BigTradeTape trades={bigTrades} symbol={symbol} />
                </div>
              </>
            )}

            {panelView === 'liquidity' && (
              <div className="flex-1 overflow-hidden">
                <LiquidityRadar
                  limitWalls={limitWalls}
                  liquidityPools={liquidityPools}
                  sweptEvents={sweptEvents}
                  currentPrice={currentPrice}
                  symbol={symbol}
                  measureToolActive={measureToolActive}
                  onToggleMeasureTool={() => setMeasureToolActive(!measureToolActive)}
                />
              </div>
            )}

            {panelView === 'dom' && (
              <div className="flex-1 overflow-hidden">
                <DepthOfMarket
                  orderBook={orderBook}
                  currentPrice={currentPrice}
                  recentTrades={recentTrades}
                  symbol={symbol}
                />
              </div>
            )}

            {panelView === 'tape' && (
              <div className="flex-1 overflow-hidden">
                <BigTradeTape trades={bigTrades} symbol={symbol} />
              </div>
            )}
          </aside>
        </div>

        {/* Windows XP Win32 Status Bar at Bottom of Window */}
        <OrderFlowStats
          broker={broker}
          symbol={symbol}
          sessionBuyVolume={sessionBuyVol}
          sessionSellVolume={sessionSellVol}
          sessionDelta={sessionBuyVol - sessionSellVol}
          tradeCount={tradeCount}
          connectionStatus={connectionStatus}
          depthCount={depthCount}
        />
      </div>

      {/* 2. Windows XP Taskbar (Bottom of Desktop) */}
      <div className={`h-8 w-full ${themeClasses.taskbar} flex items-center justify-between px-1 z-30 select-none text-xs shadow-lg`}>
        {/* Left: XP Green Start Button & Active Task */}
        <div className="flex items-center gap-1.5">
          <XPStartMenu
            symbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onResetView={handleResetView}
            presets={presets}
            onApplyPreset={handleApplyPreset}
          />

          {/* Windows XP Task Item (Pushed-in bevel) */}
          <div className={`h-6 px-3 rounded flex items-center gap-1.5 font-semibold text-[11px] shadow-inner ${themeClasses.activeTask}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[200px]">🥒 PickleChart - {symbol}</span>
          </div>
        </div>

        {/* Far Right: XP System Tray & Live Digital Clock */}
        <div className="h-6 px-2.5 rounded bg-black/20 border-t border-l border-black/40 border-r border-b border-white/20 flex items-center gap-2.5 text-[11px] font-mono text-white/90">
          {/* Mute/Audio Icon */}
          <button
            onClick={handleToggleMute}
            className="hover:opacity-80 transition-opacity"
            title={isMuted ? 'Unmute Alerts' : 'Mute Alerts'}
          >
            {isMuted ? <span className="text-rose-400 text-xs">🔇</span> : <span className="text-emerald-400 text-xs">🔊</span>}
          </button>

          {/* Network Activity Dual Monitor Icon */}
          <div className="flex items-center" title={`Connected to ${broker.toUpperCase()} Stream (${depthCount} updates)`}>
            <div className={`w-3 h-2 rounded-sm border border-white/40 flex items-center justify-center ${connectionStatus === 'connected' ? 'bg-sky-400' : 'bg-rose-500'}`}>
              <div className="w-1.5 h-0.5 bg-white" />
            </div>
          </div>

          <span>{currentTimeStr || '12:00:00'}</span>
        </div>
      </div>

      {/* 3. Deep Chart Customization & Local-First Presets Modal */}
      <ChartSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
        presets={presets}
        onApplyPreset={handleApplyPreset}
        onRefreshPresets={handleRefreshPresets}
      />
    </div>
  );
}

export default App;
