import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { BigTrade, Candle, OrderBookState, RawTrade, Timeframe } from '../../types/market';
import { LiquidityPool, RangeMeasurementResult, RestingLimitWall, SweptOrderEvent } from '../../types/liquidity';
import { DrawingItem, DrawingToolType } from '../../types/drawing';
import { ChartAppearanceSettings } from '../../types/settings';
import { DEFAULT_SETTINGS } from '../../services/settingsStorage';
import { IndicatorEngine } from '../../services/indicatorEngine';
import { LiquidityEngine } from '../../services/liquidityEngine';
import { timeframeToSeconds } from '../../services/candleAggregator';
import { computeVolumeProfile, pickBinSize, VolumeProfile } from '../../services/volumeProfile';

import { DrawingToolbar } from './DrawingToolbar';

interface CanvasChartProps {
  candles: Candle[];
  bigTrades: BigTrade[];
  orderBook: OrderBookState | null;
  timeframe: Timeframe;
  currentPrice: number;
  limitWalls?: RestingLimitWall[];
  liquidityPools?: LiquidityPool[];
  sweptEvents?: SweptOrderEvent[];
  showLimitWalls?: boolean;
  showSLTPPools?: boolean;
  showSweptMarkers?: boolean;
  measureToolActive?: boolean;
  liquidityEngine?: LiquidityEngine;
  onToggleMeasureTool?: () => void;
  settings?: ChartAppearanceSettings;
  drawings?: DrawingItem[];
  onUpdateDrawings?: (drawings: DrawingItem[]) => void;
  activeDrawingTool?: DrawingToolType;
  onSelectDrawingTool?: (tool: DrawingToolType) => void;
  drawingColor?: string;
  onDrawingColorChange?: (color: string) => void;
  resetViewTrigger?: number;
  symbol?: string;
}

export const CanvasChart: React.FC<CanvasChartProps> = ({
  candles,
  bigTrades,
  orderBook,
  timeframe,
  currentPrice,
  limitWalls = [],
  liquidityPools = [],
  sweptEvents = [],
  showLimitWalls = true,
  showSLTPPools = true,
  showSweptMarkers = true,
  measureToolActive = false,
  liquidityEngine,
  onToggleMeasureTool,
  settings = DEFAULT_SETTINGS,
  drawings = [],
  onUpdateDrawings,
  activeDrawingTool = 'select',
  onSelectDrawingTool,
  drawingColor = '#f59e0b',
  onDrawingColorChange,
  resetViewTrigger,
  symbol = 'XAUUSDT',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Volume profile is recomputed only when its inputs change, not on every hover redraw
  const vpCacheRef = useRef<{ key: string; profile: VolumeProfile | null }>({ key: '', profile: null });

  // Viewport bounds
  const [viewport, setViewport] = useState<{
    minTime: number; // Unix seconds
    maxTime: number;
    minPrice: number;
    maxPrice: number;
  } | null>(null);

  type DragMode = 'pan' | 'price-scale' | 'time-scale';

  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<{
    mode: DragMode;
    startX: number;
    startY: number;
    minTime: number;
    maxTime: number;
    minPrice: number;
    maxPrice: number;
    anchorPrice: number;
    anchorTime: number;
  } | null>(null);

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredBigTrade, setHoveredBigTrade] = useState<BigTrade | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const prevTimeframeRef = useRef<Timeframe>(timeframe);

  // Interactive Range Measurement Tool state
  const [measureBox, setMeasureBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startPrice: number;
    startTime: number;
    currentPrice: number;
    currentTime: number;
    isDrawing: boolean;
  } | null>(null);
  const [measurementResult, setMeasurementResult] = useState<RangeMeasurementResult | null>(null);

  // Selected drawing & active draft state
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<{
    type: 'box' | 'trendline' | 'fibonacci';
    time1: number;
    price1: number;
    time2: number;
    price2: number;
    color: string;
  } | null>(null);

  // Technical Indicators calculations
  const ema9Data = useMemo(() => {
    return settings.indicators.ema9.enabled ? IndicatorEngine.calculateEMA(candles, 9) : [];
  }, [candles, settings.indicators.ema9.enabled]);

  const ema21Data = useMemo(() => {
    return settings.indicators.ema21.enabled ? IndicatorEngine.calculateEMA(candles, 21) : [];
  }, [candles, settings.indicators.ema21.enabled]);

  const ema50Data = useMemo(() => {
    return settings.indicators.ema50.enabled ? IndicatorEngine.calculateEMA(candles, 50) : [];
  }, [candles, settings.indicators.ema50.enabled]);

  const ema200Data = useMemo(() => {
    return settings.indicators.ema200.enabled ? IndicatorEngine.calculateEMA(candles, 200) : [];
  }, [candles, settings.indicators.ema200.enabled]);

  const vwapData = useMemo(() => {
    return settings.indicators.vwap.enabled ? IndicatorEngine.calculateVWAP(candles) : [];
  }, [candles, settings.indicators.vwap.enabled]);

  const bollingerData = useMemo(() => {
    return settings.indicators.bollinger.enabled ? IndicatorEngine.calculateBollingerBands(candles, 20, 2) : [];
  }, [candles, settings.indicators.bollinger.enabled]);

  // Keyboard shortcuts (Del, Esc, Ctrl+Z, V, T, H, B, F, N, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDrawingId) {
          e.preventDefault();
          onUpdateDrawings?.(drawings.filter((d) => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
        }
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null);
        setActiveDraft(null);
        onSelectDrawingTool?.('select');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (drawings.length > 0) {
          onUpdateDrawings?.(drawings.slice(0, -1));
        }
      } else if (e.key.toLowerCase() === 'v') {
        onSelectDrawingTool?.('select');
      } else if (e.key.toLowerCase() === 't') {
        onSelectDrawingTool?.('trendline');
      } else if (e.key.toLowerCase() === 'b') {
        onSelectDrawingTool?.('box');
      } else if (e.key.toLowerCase() === 'h') {
        onSelectDrawingTool?.('horizontal_ray');
      } else if (e.key.toLowerCase() === 'f') {
        onSelectDrawingTool?.('fibonacci');
      } else if (e.key.toLowerCase() === 'n') {
        onSelectDrawingTool?.('text');
      } else if (e.key.toLowerCase() === 'm') {
        onToggleMeasureTool?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawings, selectedDrawingId, onUpdateDrawings, onSelectDrawingTool, onToggleMeasureTool]);

  // Layout metrics
  const RIGHT_MARGIN = 85; // Price scale + Bookmap Depth profile
  const BOTTOM_MARGIN = 28; // Time scale
  const tfSec = useMemo(() => timeframeToSeconds(timeframe), [timeframe]);

  // Price & time history for step lines
  const priceHistoryRef = useRef<Array<{ time: number; bestBid: number; bestAsk: number }>>([]);

  // Record price trajectory
  useEffect(() => {
    if (!orderBook || orderBook.bestBid <= 0) return;
    const tsSec = orderBook.timestamp > 1e11 ? orderBook.timestamp / 1000 : orderBook.timestamp;
    const list = priceHistoryRef.current;
    if (list.length === 0 || tsSec - list[list.length - 1].time >= 0.1) {
      list.push({
        time: tsSec,
        bestBid: orderBook.bestBid,
        bestAsk: orderBook.bestAsk,
      });
      if (list.length > 3000) list.shift();
    }
  }, [orderBook]);

  // Fit viewport to candles helper
  const fitViewportToCandles = useCallback((candleList: Candle[], tfSeconds: number) => {
    if (!candleList || candleList.length === 0) return;
    const lastCandle = candleList[candleList.length - 1];
    const candleCount = tfSeconds <= 5 ? 150 : (tfSeconds <= 60 ? 120 : 80);
    const visibleDuration = candleCount * tfSeconds;
    const rightPadSec = Math.max(5, visibleDuration * 0.12);
    const maxT = lastCandle.time + rightPadSec;
    const minT = maxT - visibleDuration;

    const refPrice = lastCandle.close > 0 ? lastCandle.close : (currentPrice > 0 ? currentPrice : 4340);

    let low = Infinity;
    let high = -Infinity;
    for (let i = candleList.length - 1; i >= 0; i--) {
      const c = candleList[i];
      if (c.time < minT - tfSeconds) break;
      if (c.time <= maxT + tfSeconds) {
        // Strict guard: skip any corrupt low <= 0 or wild outlier (>35% below refPrice)
        if (Number.isFinite(c.low) && c.low > 0 && c.low >= refPrice * 0.65) {
          if (c.low < low) low = c.low;
        }
        // Strict guard: skip any corrupt high or wild outlier (>35% above refPrice)
        if (Number.isFinite(c.high) && c.high > 0 && c.high <= refPrice * 1.35) {
          if (c.high > high) high = c.high;
        }
      }
    }
    if (low === Infinity || high === -Infinity || low === high || low <= 0) {
      low = refPrice - 0.50;
      high = refPrice + 0.50;
    }
    const padding = Math.max(0.20, (high - low) * 0.18);
    setViewport({
      minTime: minT,
      maxTime: maxT,
      minPrice: Math.max(0.01, low - padding),
      maxPrice: high + padding,
    });
  }, [currentPrice]);

  // Timeframe change: re-fit viewport and enable auto-follow immediately
  useEffect(() => {
    if (prevTimeframeRef.current !== timeframe) {
      prevTimeframeRef.current = timeframe;
      setAutoFollow(true);
      if (candles && candles.length > 0) {
        fitViewportToCandles(candles, tfSec);
      }
    }
  }, [timeframe, candles, tfSec, fitViewportToCandles]);

  // Live auto-follow viewport update
  useEffect(() => {
    if (!candles || candles.length === 0) return;
    if (!viewport || autoFollow) {
      fitViewportToCandles(candles, tfSec);
    }
  }, [candles, autoFollow, tfSec, fitViewportToCandles]);

  // Coordinate conversions
  const getTransforms = useCallback((width: number, height: number, vp: typeof viewport) => {
    if (!vp) return null;
    const chartW = width - RIGHT_MARGIN;
    const chartH = height - BOTTOM_MARGIN;
    const timeSpan = vp.maxTime - vp.minTime;
    const priceSpan = vp.maxPrice - vp.minPrice;

    if (
      chartW <= 0 || chartH <= 0 ||
      !Number.isFinite(timeSpan) || timeSpan <= 0 ||
      !Number.isFinite(priceSpan) || priceSpan <= 0
    ) {
      return null;
    }

    // Auto-normalize timestamp to SECONDS whether passed as seconds or milliseconds
    const timeToX = (t: number) => {
      const sec = t > 1e11 ? t / 1000 : t;
      return ((sec - vp.minTime) / timeSpan) * chartW;
    };
    const xToTime = (x: number) => vp.minTime + (x / chartW) * timeSpan;
    const priceToY = (p: number) => chartH - ((p - vp.minPrice) / priceSpan) * chartH;
    const yToPrice = (y: number) => vp.minPrice + ((chartH - y) / chartH) * priceSpan;

    return { timeToX, xToTime, priceToY, yToPrice, chartW, chartH, timeSpan, priceSpan };
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;

    const render = () => {
      let saved = false;
      try {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }

        ctx.save();
        saved = true;
        ctx.scale(dpr, dpr);

        // Custom Background Rendering
        if (settings.backgroundMode === 'gradient') {
          const grad = ctx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, settings.gradientStart || '#0d1117');
          grad.addColorStop(1, settings.gradientEnd || '#1a2233');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } else if (settings.backgroundMode === 'image' && settings.backgroundImage) {
          // Clear with subtle wash so CSS underlay image shines through
          ctx.fillStyle = 'rgba(15, 20, 30, 0.45)';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = settings.solidColor || '#11151c';
          ctx.fillRect(0, 0, width, height);
        }

        const transforms = getTransforms(width, height, viewport);
        if (!transforms || !viewport) {
          return;
        }

        const { timeToX, priceToY, chartW, chartH } = transforms;

        // Custom Watermark
        if (settings.showWatermark) {
          const rawWatermark = settings.watermarkText;
          const displayWatermark = (!rawWatermark || rawWatermark === 'ANTIGRAVITY PRO MAX' || rawWatermark === 'PICKLECHART')
            ? 'PickleChart'
            : rawWatermark;

          ctx.save();
          ctx.font = '900 44px "JetBrains Mono", sans-serif';
          ctx.fillStyle = `rgba(255, 255, 255, ${settings.watermarkOpacity || 0.08})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayWatermark, chartW / 2, chartH / 2);
          ctx.restore();
        }



      // 2. GRID LINES & TICK MARKS
      ctx.strokeStyle = '#1b2230';
      ctx.lineWidth = 1;

      // Horizontal price grid lines
      const priceSpan = viewport.maxPrice - viewport.minPrice;
      let priceStep = 0.5;
      if (priceSpan > 50) priceStep = 10;
      else if (priceSpan > 20) priceStep = 5;
      else if (priceSpan > 10) priceStep = 2;
      else if (priceSpan > 4) priceStep = 1;
      else if (priceSpan > 2) priceStep = 0.5;
      else priceStep = 0.25;

      const firstPrice = Math.floor(viewport.minPrice / priceStep) * priceStep;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // 2.5 BOOKMAP DEPTH HISTOGRAM ON RIGHT MARGIN (AS IN SCREENSHOT)
      if (orderBook) {
        const maxQty = Math.max(orderBook.maxBidQty, orderBook.maxAskQty, 12.0);
        const maxBarW = RIGHT_MARGIN - 4;

        // Bids (Green bars)
        for (const b of orderBook.bids) {
          if (b.price < viewport.minPrice || b.price > viewport.maxPrice) continue;
          const y = priceToY(b.price);
          const barW = Math.min(maxBarW, (b.qty / maxQty) * maxBarW);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
          ctx.fillRect(chartW + 2, y - 2, barW, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(chartW + 2 + barW - 2, y - 2, 2, 4);
        }

        // Asks (Red bars)
        for (const a of orderBook.asks) {
          if (a.price < viewport.minPrice || a.price > viewport.maxPrice) continue;
          const y = priceToY(a.price);
          const barW = Math.min(maxBarW, (a.qty / maxQty) * maxBarW);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(chartW + 2, y - 2, barW, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(chartW + 2 + barW - 2, y - 2, 2, 4);
        }
      }

      for (let p = firstPrice; p <= viewport.maxPrice; p += priceStep) {
        const y = priceToY(p);
        if (y < 0 || y > chartH) continue;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();

        // Price label on right margin with dark text background for contrast
        ctx.fillStyle = '#11151c';
        ctx.fillRect(chartW + 3, y - 6, 48, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(p.toFixed(2), chartW + 5, y);
      }

      // Vertical time grid lines (Dashed Bookmap Style)
      const timeSpan = viewport.maxTime - viewport.minTime;
      let timeStepSec = 60;
      if (timeSpan > 7200) timeStepSec = 1800;
      else if (timeSpan > 3600) timeStepSec = 900;
      else if (timeSpan > 1200) timeStepSec = 300;
      else if (timeSpan > 300) timeStepSec = 60;
      else if (timeSpan > 100) timeStepSec = 15;
      else if (timeSpan > 30) timeStepSec = 5;
      else timeStepSec = 2;

      const firstTime = Math.floor(viewport.minTime / timeStepSec) * timeStepSec;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let t = firstTime; t <= viewport.maxTime; t += timeStepSec) {
        const x = timeToX(t);
        if (x < 0 || x > chartW) continue;

        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = '#222c3d';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Time label on bottom axis
        const d = new Date(t * 1000);
        const timeStr = timeStepSec < 60
          ? `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
          : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        ctx.fillStyle = '#64748b';
        ctx.fillText(timeStr, x, chartH + 8);
      }

      // 3. BOOKMAP BEST BID / BEST ASK STEPPED TRAJECTORY LINES
      const trajectory = priceHistoryRef.current;
      const latestCandleTime = candles.length > 0 ? candles[candles.length - 1].time + tfSec : viewport.maxTime;
      if (trajectory.length > 1) {
        // Draw Best Bid Step Line (Green)
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < trajectory.length; i++) {
          const pt = trajectory[i];
          if (pt.time < viewport.minTime || pt.time > latestCandleTime + 2) continue;
          if (!Number.isFinite(pt.bestBid) || pt.bestBid <= 0) continue;
          const x = timeToX(pt.time);
          const y = priceToY(pt.bestBid);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            const prevBid = trajectory[i - 1]?.bestBid;
            const prevY = prevBid && prevBid > 0 ? priceToY(prevBid) : y;
            ctx.lineTo(x, prevY); // Step horizontal
            ctx.lineTo(x, y); // Step vertical
          }
        }
        ctx.stroke();

        // Draw Best Ask Step Line (Red)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        started = false;
        for (let i = 0; i < trajectory.length; i++) {
          const pt = trajectory[i];
          if (pt.time < viewport.minTime || pt.time > latestCandleTime + 2) continue;
          if (!Number.isFinite(pt.bestAsk) || pt.bestAsk <= 0) continue;
          const x = timeToX(pt.time);
          const y = priceToY(pt.bestAsk);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            const prevAsk = trajectory[i - 1]?.bestAsk;
            const prevY = prevAsk && prevAsk > 0 ? priceToY(prevAsk) : y;
            ctx.lineTo(x, prevY);
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // 3.5 VISIBLE-RANGE VOLUME PROFILE (drawn under the candles)
      let pocTag: { y: number; price: number; color: string } | null = null;
      if (settings.indicators.volumeProfile?.enabled) {
        const trades = liquidityEngine ? liquidityEngine.getTradeHistory() : [];
        const pricePerPx = (viewport.maxPrice - viewport.minPrice) / Math.max(1, chartH);
        const binSize = pickBinSize(pricePerPx, 3, 0.1);
        const lastC = candles[candles.length - 1];
        const lastT = trades[trades.length - 1];
        const key = [
          viewport.minTime, viewport.maxTime, binSize, tfSec, candles.length,
          lastC ? `${lastC.time}:${lastC.volume}` : '', trades.length, lastT ? lastT.time : 0,
        ].join('|');
        if (vpCacheRef.current.key !== key) {
          vpCacheRef.current = {
            key,
            profile: computeVolumeProfile(candles, trades as RawTrade[], viewport.minTime, viewport.maxTime, tfSec, binSize),
          };
        }
        const vp = vpCacheRef.current.profile;

        if (vp && vp.maxTotal > 0) {
          ctx.save();
          const maxW = Math.min(170, chartW * 0.22);
          const scale = maxW / vp.maxTotal;
          const rowPx = Math.max(1, (vp.binSize / (viewport.maxPrice - viewport.minPrice)) * chartH);
          const gap = rowPx >= 4 ? 1 : 0;
          const vpColor = settings.indicators.volumeProfile.color || '#fbbf24';

          for (const r of vp.rows) {
            if (r.total <= 0) continue;
            const top = r.price + vp.binSize;
            if (top < viewport.minPrice || r.price > viewport.maxPrice) continue;
            const yTop = priceToY(top);
            const h = Math.max(1, rowPx - gap);
            const inVA = r.price >= vp.valPrice - 1e-9 && top <= vp.vahPrice + 1e-9;
            const a = inVA ? 0.42 : 0.2;

            // Stack right-to-left from the price scale: ticks first (solid), estimates after (faded)
            let x = chartW;
            const seg = (v: number, color: string) => {
              if (v <= 0) return;
              const w = v * scale;
              x -= w;
              ctx.fillStyle = color;
              ctx.fillRect(x, yTop, w, h);
            };
            seg(r.buy, `rgba(34, 197, 94, ${a})`);
            seg(r.sell, `rgba(239, 68, 68, ${a})`);
            // Candle-estimated volume: same hues, lighter and desaturated
            seg(r.estBuy, `rgba(110, 190, 140, ${a * 0.7})`);
            seg(r.estSell, `rgba(200, 120, 120, ${a * 0.7})`);
          }

          // POC across the chart, VAH / VAL over the profile
          const pocY = priceToY(vp.pocPrice);
          if (pocY >= 0 && pocY <= chartH) {
            ctx.strokeStyle = vpColor;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(0, pocY);
            ctx.lineTo(chartW, pocY);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          for (const p of [vp.vahPrice, vp.valPrice]) {
            const y = priceToY(p);
            if (y < 0 || y > chartH) continue;
            ctx.beginPath();
            ctx.moveTo(chartW - maxW, y);
            ctx.lineTo(chartW, y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;

          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = vpColor;
          const lbl = (text: string, p: number) => {
            const y = priceToY(p);
            if (y < 10 || y > chartH) return;
            ctx.fillText(text, chartW - maxW - 4, y - 1);
          };
          // POC tag is drawn later on the right price scale (see 7.5)
          if (pocY >= 0 && pocY <= chartH) pocTag = { y: pocY, price: vp.pocPrice, color: vpColor };
          lbl(`VAH ${vp.vahPrice.toFixed(2)}`, vp.vahPrice);
          ctx.textBaseline = 'top';
          const valY = priceToY(vp.valPrice);
          if (valY >= 0 && valY < chartH - 10) ctx.fillText(`VAL ${vp.valPrice.toFixed(2)}`, chartW - maxW - 4, valY + 1);

          // Data quality note: share of the profile built from real ticks
          if (vp.tickShare < 0.999) {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`VP ticks ${(vp.tickShare * 100).toFixed(0)}% · faded = est. from candles`, chartW - 4, 4);
          }
          ctx.restore();
        }
      }

      // 4. CANDLESTICKS (Clear, vivid bodies and crisp wicks)
      const candleWidth = Math.max(3, Math.min(26, (chartW / (viewport.maxTime - viewport.minTime)) * tfSec * 0.82));
      for (const c of candles) {
        if (c.time + tfSec < viewport.minTime || c.time > viewport.maxTime) continue;
        if (!c || !Number.isFinite(c.open) || !Number.isFinite(c.close) || c.open <= 0 || c.close <= 0) continue;

        const open = c.open;
        const close = c.close;
        const safeHigh = Number.isFinite(c.high) && c.high >= Math.max(open, close) ? c.high : Math.max(open, close);
        const safeLow = Number.isFinite(c.low) && c.low > 0 && c.low <= Math.min(open, close) ? c.low : Math.min(open, close);

        const x = timeToX(c.time);
        const openY = priceToY(open);
        const closeY = priceToY(close);
        // Clamp wick coordinates safely to chart bounds so no line can ever shoot off screen
        const highY = Math.max(-10, Math.min(chartH + 10, priceToY(safeHigh)));
        const lowY = Math.max(-10, Math.min(chartH + 10, priceToY(safeLow)));

        const isUp = close >= open;
        const wickColor = isUp ? (settings.wickUpColor || '#22c55e') : (settings.wickDownColor || '#ef4444');
        const bodyColor = isUp ? (settings.candleUpColor || '#22c55e') : (settings.candleDownColor || '#ef4444');

        // Wick
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.round(x), Math.round(highY));
        ctx.lineTo(Math.round(x), Math.round(lowY));
        ctx.stroke();

        // Body
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(2.0, Math.abs(closeY - openY));
        const bodyW = Math.max(3, Math.round(candleWidth));
        const bodyX = Math.round(x - bodyW / 2);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(bodyX, Math.round(topY), bodyW, Math.round(bodyH));

        // Outline
        if (settings.showBorders) {
          ctx.strokeStyle = isUp ? '#15803d' : '#991b1b';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bodyX, Math.round(topY), bodyW, Math.round(bodyH));
        }
      }

      // 4.5 TECHNICAL INDICATORS (EMA, VWAP, BOLLINGER BANDS)
      const drawLineSeries = (pts: Array<{ time: number; value: number }>, color: string, lineWidth: number = 1.5, dash: number[] = []) => {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < pts.length; i++) {
          const pt = pts[i];
          if (pt.time < viewport.minTime - tfSec || pt.time > viewport.maxTime + tfSec) continue;
          const x = timeToX(pt.time);
          const y = priceToY(pt.value);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      };

      if (settings.indicators.bollinger.enabled && bollingerData.length > 1) {
        ctx.save();
        const visibleBoll = bollingerData.filter(pt => pt.time >= viewport.minTime - tfSec && pt.time <= viewport.maxTime + tfSec);
        if (visibleBoll.length > 1) {
          // Fill between bands
          ctx.fillStyle = `${settings.indicators.bollinger.color}15`;
          ctx.beginPath();
          for (let i = 0; i < visibleBoll.length; i++) {
            const x = timeToX(visibleBoll[i].time);
            const y = priceToY(visibleBoll[i].upper);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          for (let i = visibleBoll.length - 1; i >= 0; i--) {
            const x = timeToX(visibleBoll[i].time);
            const y = priceToY(visibleBoll[i].lower);
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();

          drawLineSeries(visibleBoll.map(b => ({ time: b.time, value: b.upper })), settings.indicators.bollinger.color, 1.0, [2, 2]);
          drawLineSeries(visibleBoll.map(b => ({ time: b.time, value: b.middle })), settings.indicators.bollinger.color, 1.2);
          drawLineSeries(visibleBoll.map(b => ({ time: b.time, value: b.lower })), settings.indicators.bollinger.color, 1.0, [2, 2]);
        }
        ctx.restore();
      }

      if (settings.indicators.ema9.enabled) drawLineSeries(ema9Data, settings.indicators.ema9.color, 1.5);
      if (settings.indicators.ema21.enabled) drawLineSeries(ema21Data, settings.indicators.ema21.color, 1.5);
      if (settings.indicators.ema50.enabled) drawLineSeries(ema50Data, settings.indicators.ema50.color, 1.8);
      if (settings.indicators.ema200.enabled) drawLineSeries(ema200Data, settings.indicators.ema200.color, 2.0);
      if (settings.indicators.vwap.enabled) drawLineSeries(vwapData, settings.indicators.vwap.color, 2.0, [3, 2]);

      // 4.8 USER DRAWINGS (BOXES, TRENDLINES, HORIZONTAL RAYS, FIBONACCI, TEXT)
      if (drawings && drawings.length > 0) {
        ctx.save();
        for (const d of drawings) {
          const isSelected = d.id === selectedDrawingId;

          if (d.type === 'box' && d.price2 !== undefined && d.time2 !== undefined) {
            const x1 = timeToX(d.time1);
            const y1 = priceToY(d.price1);
            const x2 = timeToX(d.time2);
            const y2 = priceToY(d.price2);
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.max(2, Math.abs(x2 - x1));
            const rh = Math.max(2, Math.abs(y2 - y1));

            // Fill
            ctx.fillStyle = d.fillColor || `${d.color}25`;
            ctx.fillRect(rx, ry, rw, rh);

            // Border
            ctx.strokeStyle = d.color;
            ctx.lineWidth = d.lineWidth || 1.5;
            ctx.setLineDash(d.lineDash || []);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);

            // Label
            if (d.label) {
              ctx.font = 'bold 10px "JetBrains Mono", monospace';
              ctx.fillStyle = d.color;
              ctx.fillText(d.label, rx + 4, ry + 12);
            }

            // Selection handles
            if (isSelected) {
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#0055ea';
              ctx.lineWidth = 1.5;
              const hs = 6;
              [ [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh] ].forEach(([hx, hy]) => {
                ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
                ctx.strokeRect(hx - hs/2, hy - hs/2, hs, hs);
              });
            }
          } else if (d.type === 'trendline' && d.price2 !== undefined && d.time2 !== undefined) {
            const x1 = timeToX(d.time1);
            const y1 = priceToY(d.price1);
            const x2 = timeToX(d.time2);
            const y2 = priceToY(d.price2);

            ctx.strokeStyle = d.color;
            ctx.lineWidth = d.lineWidth || 1.8;
            ctx.setLineDash(d.lineDash || []);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.setLineDash([]);

            if (isSelected) {
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#0055ea';
              ctx.lineWidth = 1.5;
              const hs = 6;
              [ [x1, y1], [x2, y2] ].forEach(([hx, hy]) => {
                ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
                ctx.strokeRect(hx - hs/2, hy - hs/2, hs, hs);
              });
            }
          } else if (d.type === 'horizontal_ray') {
            const y = priceToY(d.price1);
            ctx.strokeStyle = d.color;
            ctx.lineWidth = d.lineWidth || 1.5;
            ctx.setLineDash(d.lineDash || [4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(chartW, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Price badge on right scale
            ctx.fillStyle = d.color;
            ctx.fillRect(chartW + 2, y - 7, RIGHT_MARGIN - 4, 14);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.price1.toFixed(2), chartW + 5, y);
          } else if (d.type === 'fibonacci' && d.price2 !== undefined && d.time2 !== undefined) {
            const x1 = Math.min(timeToX(d.time1), timeToX(d.time2));
            const x2 = Math.max(timeToX(d.time1), timeToX(d.time2));
            const pDiff = d.price2 - d.price1;
            const fibLevels = [
              { level: 0, color: '#78716c' },
              { level: 0.236, color: '#ef4444' },
              { level: 0.382, color: '#f59e0b' },
              { level: 0.5, color: '#10b981' },
              { level: 0.618, color: '#06b6d4' },
              { level: 0.786, color: '#8b5cf6' },
              { level: 1.0, color: '#78716c' },
            ];

            fibLevels.forEach((fib) => {
              const fibPrice = d.price1 + pDiff * fib.level;
              const y = priceToY(fibPrice);
              ctx.strokeStyle = fib.color;
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 2]);
              ctx.beginPath();
              ctx.moveTo(x1, y);
              ctx.lineTo(Math.max(chartW, x2), y);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = fib.color;
              ctx.font = '9px "JetBrains Mono", monospace';
              ctx.fillText(`${(fib.level * 100).toFixed(1)}% ($${fibPrice.toFixed(2)})`, x1 + 4, y - 2);
            });
          } else if (d.type === 'text') {
            const x = timeToX(d.time1);
            const y = priceToY(d.price1);
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            const txt = d.text || 'Note';
            const tw = ctx.measureText(txt).width;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(x - 2, y - 10, tw + 8, 16);
            ctx.strokeStyle = d.color;
            ctx.strokeRect(x - 2, y - 10, tw + 8, 16);

            ctx.fillStyle = d.color;
            ctx.fillText(txt, x + 2, y + 2);
          }
        }
        ctx.restore();
      }

      // 4.9 ACTIVE DRAFT IN PROGRESS
      if (activeDraft) {
        ctx.save();
        const x1 = timeToX(activeDraft.time1);
        const y1 = priceToY(activeDraft.price1);
        const x2 = timeToX(activeDraft.time2);
        const y2 = priceToY(activeDraft.price2);

        if (activeDraft.type === 'box') {
          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.max(2, Math.abs(x2 - x1));
          const rh = Math.max(2, Math.abs(y2 - y1));
          ctx.fillStyle = `${activeDraft.color}25`;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = activeDraft.color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (activeDraft.type === 'trendline') {
          ctx.strokeStyle = activeDraft.color;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (activeDraft.type === 'fibonacci') {
          ctx.strokeStyle = activeDraft.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. BOOKMAP 3D SPLIT GREEN/RED BIG TRADE SPHERES (THE BALLS)
      const now = Date.now();
      for (const bt of bigTrades) {
        const tradeTimeSec = bt.time / 1000;
        if (tradeTimeSec < viewport.minTime || tradeTimeSec > viewport.maxTime) continue;

        const x = timeToX(tradeTimeSec);
        const y = priceToY(bt.price);

        // Size scaling: 10 contracts base radius ~ 9px, 50 contracts ~ 18px, 100 contracts ~ 26px
        const contracts = bt.qty || (bt.buyQty + bt.sellQty) || 1;
        const radius = Math.max(7, Math.min(38, Math.sqrt(contracts) * 2.6));

        const totalVol = (bt.buyQty || 0) + (bt.sellQty || 0);
        const rawRatio = totalVol > 0 ? (bt.buyQty || 0) / totalVol : (bt.side === 'buy' ? 0.70 : 0.30);
        // Clamp so BOTH green and red halves are always clearly distinct on every Bookmap sphere
        const buyRatio = Math.max(0.22, Math.min(0.78, rawRatio));
        const isPureBuy = rawRatio >= 0.5;

        // Expanding ripple ring if trade occurred within last 1200ms
        const ageMs = now - bt.time;
        if (ageMs < 1200 && ageMs >= 0) {
          const progress = ageMs / 1200;
          const rippleRadius = radius + progress * 26;
          ctx.beginPath();
          ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isPureBuy
            ? `rgba(34, 197, 94, ${(1 - progress) * 0.9})`
            : `rgba(239, 68, 68, ${(1 - progress) * 0.9})`;
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        // Draw 3D Spherical Volume Bubble with Green Top and Red Bottom
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip(); // Clip to sphere boundary

        // Top section (Green - Buy Taker)
        const splitY = y + radius * (1 - 2 * buyRatio);
        ctx.fillStyle = '#22c55e'; // Vibrant green
        ctx.fillRect(x - radius, y - radius, radius * 2, splitY - (y - radius));

        // Bottom section (Red - Sell Taker)
        ctx.fillStyle = '#ef4444'; // Vibrant red
        ctx.fillRect(x - radius, splitY, radius * 2, (y + radius) - splitY);

        // Horizontal dividing seam line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x - radius, splitY);
        ctx.lineTo(x + radius, splitY);
        ctx.stroke();

        // 3D Radial Sphere Lighting Gradient (Creates specular highlight near top-left)
        const lightX = x - radius * 0.35;
        const lightY = y - radius * 0.35;
        const sphereShade = ctx.createRadialGradient(
          lightX,
          lightY,
          radius * 0.05,
          x,
          y,
          radius
        );
        sphereShade.addColorStop(0, 'rgba(255, 255, 255, 0.65)'); // bright specular spot
        sphereShade.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
        sphereShade.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
        sphereShade.addColorStop(1, 'rgba(0, 0, 0, 0.65)'); // dark edge shadow

        ctx.fillStyle = sphereShade;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();

        // Dark outline ring around the sphere
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#05070a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Display contract number inside the ball if big enough
        if (radius >= 11) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Drop shadow for text readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 3;
          ctx.fillText(`${Math.round(contracts)}`, x, y);
          ctx.shadowBlur = 0;
        }
      }

      // 6. BOOKMAP INSIDE MARKET BADGE ON RIGHT SCALE
      if (orderBook && orderBook.bestBid > 0 && orderBook.bestAsk > 0) {
        const bidY = priceToY(orderBook.bestBid);
        const askY = priceToY(orderBook.bestAsk);

        // Best Bid Tag (Green Box)
        if (bidY >= 0 && bidY <= chartH) {
          ctx.fillStyle = '#15803d';
          ctx.fillRect(chartW + 2, bidY - 8, RIGHT_MARGIN - 4, 16);
          ctx.strokeStyle = '#22c55e';
          ctx.strokeRect(chartW + 2, bidY - 8, RIGHT_MARGIN - 4, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(`${orderBook.bestBid.toFixed(2)}`, chartW + 6, bidY);
        }

        // Best Ask Tag (Red Box)
        if (askY >= 0 && askY <= chartH) {
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(chartW + 2, askY - 8, RIGHT_MARGIN - 4, 16);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(chartW + 2, askY - 8, RIGHT_MARGIN - 4, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(`${orderBook.bestAsk.toFixed(2)}`, chartW + 6, askY);
        }
      }

      // 7. CURRENT PRICE LINE & BADGE
      if (currentPrice > 0) {
        const currentY = priceToY(currentPrice);
        if (currentY >= 0 && currentY <= chartH) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, currentY);
          ctx.lineTo(chartW, currentY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 7.1 RESTING LIMIT ORDER WALLS (Bids & Asks)
      if (showLimitWalls && limitWalls.length > 0) {
        ctx.save();
        for (const wall of limitWalls) {
          if (wall.price < viewport.minPrice || wall.price > viewport.maxPrice) continue;
          const y = priceToY(wall.price);
          if (y < 0 || y > chartH) continue;

          const isBuy = wall.side === 'buy';
          const strokeColor = isBuy ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)';
          const badgeBg = isBuy ? '#064e3b' : '#7f1d1d';
          const badgeBorder = isBuy ? '#10b981' : '#f43f5e';
          const textColor = isBuy ? '#6ee7b7' : '#fda4af';

          // Wall guide line
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = wall.isSignificant ? 1.5 : 1.0;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Wall label badge on right side of chart
          const badgeText = `${isBuy ? 'LIMIT BUY' : 'LIMIT SELL'} ${wall.volume.toFixed(1)} XAU`;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const textW = ctx.measureText(badgeText).width;
          const badgeX = chartW - textW - 14;

          ctx.fillStyle = badgeBg;
          ctx.fillRect(badgeX, y - 7, textW + 10, 14);
          ctx.strokeStyle = badgeBorder;
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, y - 7, textW + 10, 14);

          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, badgeX + 5, y);
        }
        ctx.restore();
      }

      // 7.2 ESTIMATED SL / TP LIQUIDITY POOLS (BSL / SSL)
      if (showSLTPPools && liquidityPools.length > 0) {
        ctx.save();
        for (const pool of liquidityPools) {
          if (pool.price < viewport.minPrice || pool.price > viewport.maxPrice) continue;
          const y = priceToY(pool.price);
          if (y < 0 || y > chartH) continue;

          const isBSL = pool.type === 'BSL';
          const lineColor = pool.isSwept
            ? 'rgba(100, 116, 139, 0.4)'
            : (isBSL ? 'rgba(245, 158, 11, 0.7)' : 'rgba(6, 182, 212, 0.7)');

          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Badge
          const badgeText = pool.isSwept
            ? `${pool.type} SWEPT ✓`
            : `${pool.type}: SWING VOL ~${pool.estimatedVolume.toFixed(0)} XAU`;

          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const textW = ctx.measureText(badgeText).width;
          const badgeX = 8;

          ctx.fillStyle = pool.isSwept ? 'rgba(15, 23, 42, 0.85)' : (isBSL ? 'rgba(120, 53, 15, 0.85)' : 'rgba(22, 78, 99, 0.85)');
          ctx.fillRect(badgeX, y - 7, textW + 8, 14);
          ctx.strokeStyle = pool.isSwept ? '#475569' : (isBSL ? '#f59e0b' : '#06b6d4');
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, y - 7, textW + 8, 14);

          ctx.fillStyle = pool.isSwept ? '#94a3b8' : (isBSL ? '#fde68a' : '#a5f3fc');
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, badgeX + 4, y);
        }
        ctx.restore();
      }

      // 7.3 SWEPT ORDERS & ABSORPTION MARKERS ("จุดที่ออเดอร์ถูกเก็บไปแล้ว")
      // Nearby sweeps on the same side are merged into one badge (in screen space,
      // so grouping follows zoom): every sweep keeps its dot, but only one label
      // per cluster is drawn, e.g. "SWEPT ✓ ×6 · 27.4 XAU".
      if (showSweptMarkers && sweptEvents.length > 0) {
        ctx.save();
        const maxSweptToDraw = Math.min(25, sweptEvents.length);
        const CLUSTER_DX = 70; // px
        const CLUSTER_DY = 16; // px

        type SweepCluster = {
          isBuy: boolean;
          count: number;
          volume: number;
          minPrice: number;
          maxPrice: number;
          sumX: number;
          anchorX: number;
          anchorY: number; // y of the outermost price (top for buys, bottom for sells)
        };
        const clusters: SweepCluster[] = [];

        for (let sIdx = 0; sIdx < maxSweptToDraw; sIdx++) {
          const ev = sweptEvents[sIdx];
          const evTimeSec = ev.time / 1000;
          if (evTimeSec < viewport.minTime || evTimeSec > viewport.maxTime) continue;
          if (ev.price < viewport.minPrice || ev.price > viewport.maxPrice) continue;

          const x = timeToX(evTimeSec);
          const y = priceToY(ev.price);
          if (x < 0 || x > chartW || y < 0 || y > chartH) continue;

          const isBuySweep = ev.aggressorSide === 'buy';

          // Ghost strike-through trail line extending 80px to right
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = isBuySweep ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(Math.min(chartW, x + 80), y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Swept icon circle / node
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isBuySweep ? '#10b981' : '#f43f5e';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Merge into an existing cluster of the same side if close on screen
          const cl = clusters.find(
            (c) =>
              c.isBuy === isBuySweep &&
              Math.abs(c.sumX / c.count - x) <= CLUSTER_DX &&
              y >= priceToY(c.maxPrice) - CLUSTER_DY &&
              y <= priceToY(c.minPrice) + CLUSTER_DY
          );
          if (cl) {
            cl.count += 1;
            cl.volume += ev.volume;
            cl.sumX += x;
            cl.minPrice = Math.min(cl.minPrice, ev.price);
            cl.maxPrice = Math.max(cl.maxPrice, ev.price);
            cl.anchorX = Math.max(cl.anchorX, x);
            cl.anchorY = isBuySweep ? Math.min(cl.anchorY, y) : Math.max(cl.anchorY, y);
          } else {
            clusters.push({
              isBuy: isBuySweep,
              count: 1,
              volume: ev.volume,
              minPrice: ev.price,
              maxPrice: ev.price,
              sumX: x,
              anchorX: x,
              anchorY: y,
            });
          }
        }

        // One badge per cluster
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        for (const c of clusters) {
          const range =
            c.count > 1 && c.maxPrice - c.minPrice > 0.001
              ? ` @${c.minPrice.toFixed(1)}–${c.maxPrice.toFixed(1)}`
              : '';
          const badgeText =
            c.count > 1
              ? `SWEPT ✓ ×${c.count} · ${c.volume.toFixed(1)} XAU${range}`
              : `SWEPT ✓ ${c.volume.toFixed(1)} XAU`;
          const bW = ctx.measureText(badgeText).width;
          const cx = c.sumX / c.count;
          const bX = Math.max(4, Math.min(chartW - bW - 14, cx - bW / 2));
          const bY = c.isBuy ? c.anchorY - 18 : c.anchorY + 6;

          ctx.fillStyle = c.isBuy ? 'rgba(6, 78, 59, 0.92)' : 'rgba(136, 19, 55, 0.92)';
          ctx.fillRect(bX - 4, bY, bW + 8, 13);
          ctx.strokeStyle = c.isBuy ? '#34d399' : '#fb7185';
          ctx.lineWidth = 1;
          ctx.strokeRect(bX - 4, bY, bW + 8, 13);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(badgeText, bX, bY + 1.5);
        }

        // Key absorptions: amber ring + a level line to the right edge (kept for 30 min)
        const nowSec = Date.now() / 1000;
        for (const ev of sweptEvents) {
          if (!ev.significant) continue;
          const tSec = ev.time / 1000;
          if (nowSec - tSec > 1800) continue;
          if (tSec > viewport.maxTime || ev.price < viewport.minPrice || ev.price > viewport.maxPrice) continue;
          const x = Math.max(0, timeToX(tSec));
          const y = priceToY(ev.price);
          const up = ev.aggressorSide === 'sell';

          ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();

          if (x > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#f59e0b';
            ctx.stroke();
          }

          const txt = `🛡 ABSORB ${ev.volume.toFixed(1)} ${up ? '↑' : '↓'}`;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const w = ctx.measureText(txt).width;
          const lx = Math.min(chartW - w - 10, Math.max(4, x + 12));
          const ly = up ? y + 3 : y - 16;
          ctx.fillStyle = 'rgba(28, 21, 8, 0.92)';
          ctx.fillRect(lx - 3, ly, w + 6, 13);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(lx - 3, ly, w + 6, 13);
          ctx.fillStyle = '#fcd34d';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(txt, lx, ly + 1.5);
        }
        ctx.restore();
      }

      // 7.4 ACTIVE RANGE MEASUREMENT SELECTION BOX
      if (measureBox) {
        ctx.save();
        const x1 = Math.min(measureBox.startX, measureBox.currentX);
        const y1 = Math.min(measureBox.startY, measureBox.currentY);
        const w = Math.max(2, Math.abs(measureBox.currentX - measureBox.startX));
        const h = Math.max(2, Math.abs(measureBox.currentY - measureBox.startY));

        // Translucent background
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.fillRect(x1, y1, w, h);

        // Dashed Amber Border
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x1, y1, w, h);
        ctx.setLineDash([]);

        // Top-left price tag
        const highP = Math.max(measureBox.startPrice, measureBox.currentPrice);
        const lowP = Math.min(measureBox.startPrice, measureBox.currentPrice);
        const diffP = Math.abs(highP - lowP);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x1 + 4, y1 + 4, 110, 16);
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(x1 + 4, y1 + 4, 110, 16);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`ZONE: Δ${diffP.toFixed(2)} pts`, x1 + 8, y1 + 12);
        ctx.restore();
      }

      // 7.5 POC TAG ON THE RIGHT PRICE SCALE (on top of other scale badges;
      // nudged off the current-price badge so both stay readable)
      if (pocTag) {
        const tagH = 14;
        let tagY = pocTag.y - tagH / 2;
        // Best bid / ask badges on the scale are 16px tall, centred on their price
        const occupied = [orderBook?.bestBid, orderBook?.bestAsk, currentPrice]
          .filter((p): p is number => !!p && p > 0)
          .map((p) => priceToY(p));
        if (occupied.some((y) => tagY < y + 8 && tagY + tagH > y - 8)) {
          const top = Math.min(...occupied) - 8;
          const bottom = Math.max(...occupied) + 8;
          tagY = pocTag.y <= (top + bottom) / 2 ? top - tagH - 2 : bottom + 2;
        }
        tagY = Math.max(0, Math.min(chartH - tagH, tagY));
        ctx.save();
        ctx.fillStyle = pocTag.color;
        ctx.fillRect(chartW + 2, tagY, RIGHT_MARGIN - 4, tagH);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;
        ctx.strokeRect(chartW + 2, tagY, RIGHT_MARGIN - 4, tagH);
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`POC ${pocTag.price.toFixed(2)}`, chartW + 5, tagY + tagH / 2 + 0.5);
        ctx.restore();
      }

      // 8. CROSSHAIR & HOVER TOOLTIP
      if (hoverPos && hoverPos.x <= chartW && hoverPos.y <= chartH) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(hoverPos.x, 0);
        ctx.lineTo(hoverPos.x, chartH);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, hoverPos.y);
        ctx.lineTo(chartW, hoverPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover Time Tag
        const hoverTime = transforms.xToTime(hoverPos.x);
        const hd = new Date(hoverTime * 1000);
        const hTimeStr = `${String(hd.getHours()).padStart(2, '0')}:${String(hd.getMinutes()).padStart(2, '0')}:${String(hd.getSeconds()).padStart(2, '0')}`;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(hoverPos.x - 35, chartH + 3, 70, 20);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hTimeStr, hoverPos.x, chartH + 13);

        // Hover Price Tag
        const hoverPrice = transforms.yToPrice(hoverPos.y);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(chartW + 2, hoverPos.y - 9, RIGHT_MARGIN - 4, 18);
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(hoverPrice.toFixed(2), chartW + 6, hoverPos.y);
      }

      } catch (err) {
        console.error('[CanvasChart Render Loop Error]:', err);
      } finally {
        if (saved) {
          ctx.restore();
        }
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    candles,
    bigTrades,
    orderBook,
    timeframe,
    currentPrice,
    viewport,
    hoverPos,
    getTransforms,
    tfSec,
    limitWalls,
    liquidityPools,
    sweptEvents,
    showLimitWalls,
    showSLTPPools,
    showSweptMarkers,
    measureBox,
    settings,
    drawings,
    activeDraft,
    selectedDrawingId,
    bollingerData,
    ema9Data,
    ema21Data,
    ema50Data,
    ema200Data,
    vwapData,
  ]);

  // Mouse interaction handlers (TradingView style)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartW = rect.width - RIGHT_MARGIN;
    const chartH = rect.height - BOTTOM_MARGIN;

    // Measure Tool handler
    if (measureToolActive && x <= chartW && y <= chartH) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        const startPrice = transforms.yToPrice(y);
        const startTime = transforms.xToTime(x);
        setMeasureBox({
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          startPrice,
          startTime,
          currentPrice: startPrice,
          currentTime: startTime,
          isDrawing: true,
        });
        setMeasurementResult(null);
        return;
      }
    }

    // Active Drawing Tool handler
    if (activeDrawingTool && activeDrawingTool !== 'select' && x <= chartW && y <= chartH) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        const clickPrice = transforms.yToPrice(y);
        const clickTime = transforms.xToTime(x);

        if (activeDrawingTool === 'measure') {
          onToggleMeasureTool?.();
          onSelectDrawingTool?.('select');
          return;
        }

        if (activeDrawingTool === 'horizontal_ray') {
          const newDrawing: DrawingItem = {
            id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'horizontal_ray',
            time1: clickTime,
            price1: clickPrice,
            color: drawingColor,
            lineWidth: 1.5,
            createdAt: Date.now(),
          };
          onUpdateDrawings?.([...drawings, newDrawing]);
          setSelectedDrawingId(newDrawing.id);
          onSelectDrawingTool?.('select');
          return;
        }

        if (activeDrawingTool === 'text') {
          const note = window.prompt('Enter callout / level note:', 'Key Support / Resistance');
          if (note && note.trim()) {
            const newDrawing: DrawingItem = {
              id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: 'text',
              time1: clickTime,
              price1: clickPrice,
              color: drawingColor,
              text: note.trim(),
              createdAt: Date.now(),
            };
            onUpdateDrawings?.([...drawings, newDrawing]);
            setSelectedDrawingId(newDrawing.id);
          }
          onSelectDrawingTool?.('select');
          return;
        }

        if (activeDrawingTool === 'box' || activeDrawingTool === 'trendline' || activeDrawingTool === 'fibonacci') {
          setActiveDraft({
            type: activeDrawingTool,
            time1: clickTime,
            price1: clickPrice,
            time2: clickTime,
            price2: clickPrice,
            color: drawingColor,
          });
          return;
        }
      }
    }

    // Select mode: Hit-test existing drawings to select them
    if (activeDrawingTool === 'select' && x <= chartW && y <= chartH && drawings.length > 0) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        let clickedId: string | null = null;
        for (let i = drawings.length - 1; i >= 0; i--) {
          const d = drawings[i];
          if (d.type === 'box' && d.price2 !== undefined && d.time2 !== undefined) {
            const x1 = transforms.timeToX(d.time1);
            const y1 = transforms.priceToY(d.price1);
            const x2 = transforms.timeToX(d.time2);
            const y2 = transforms.priceToY(d.price2);
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.max(8, Math.abs(x2 - x1));
            const rh = Math.max(8, Math.abs(y2 - y1));
            if (x >= rx - 4 && x <= rx + rw + 4 && y >= ry - 4 && y <= ry + rh + 4) {
              clickedId = d.id;
              break;
            }
          } else if (d.type === 'trendline' && d.price2 !== undefined && d.time2 !== undefined) {
            const x1 = transforms.timeToX(d.time1);
            const y1 = transforms.priceToY(d.price1);
            const x2 = transforms.timeToX(d.time2);
            const y2 = transforms.priceToY(d.price2);
            const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
            let dist = 999;
            if (l2 === 0) {
              dist = Math.hypot(x - x1, y - y1);
            } else {
              const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2));
              const projX = x1 + t * (x2 - x1);
              const projY = y1 + t * (y2 - y1);
              dist = Math.hypot(x - projX, y - projY);
            }
            if (dist <= 8) {
              clickedId = d.id;
              break;
            }
          } else if (d.type === 'horizontal_ray') {
            const yRay = transforms.priceToY(d.price1);
            if (Math.abs(y - yRay) <= 8) {
              clickedId = d.id;
              break;
            }
          } else if (d.type === 'fibonacci' && d.price2 !== undefined && d.time2 !== undefined) {
            const y1 = transforms.priceToY(d.price1);
            const y2 = transforms.priceToY(d.price2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            if (y >= minY - 6 && y <= maxY + 6) {
              clickedId = d.id;
              break;
            }
          } else if (d.type === 'text') {
            const tx = transforms.timeToX(d.time1);
            const ty = transforms.priceToY(d.price1);
            if (Math.hypot(x - tx, y - ty) <= 24) {
              clickedId = d.id;
              break;
            }
          }
        }
        if (clickedId) {
          setSelectedDrawingId(clickedId);
          return;
        } else {
          setSelectedDrawingId(null);
        }
      }
    }

    let mode: DragMode = 'pan';
    if (x > chartW && y <= chartH) {
      mode = 'price-scale';
    } else if (y > chartH && x <= chartW) {
      mode = 'time-scale';
    } else {
      mode = 'pan';
    }

    const transforms = getTransforms(rect.width, rect.height, viewport);
    const anchorPrice = transforms ? transforms.yToPrice(y) : (viewport.minPrice + viewport.maxPrice) / 2;
    const anchorTime = transforms ? transforms.xToTime(x) : (viewport.minTime + viewport.maxTime) / 2;

    setIsDragging(true);
    setAutoFollow(false);
    setDragState({
      mode,
      startX: x,
      startY: y,
      minTime: viewport.minTime,
      maxTime: viewport.maxTime,
      minPrice: viewport.minPrice,
      maxPrice: viewport.maxPrice,
      anchorPrice,
      anchorTime,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y });

    const chartW = rect.width - RIGHT_MARGIN;
    const chartH = rect.height - BOTTOM_MARGIN;

    // Active Drawing Draft Drag
    if (activeDraft && viewport) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        const curPrice = transforms.yToPrice(y);
        const curTime = transforms.xToTime(x);
        setActiveDraft((prev) => (prev ? { ...prev, time2: curTime, price2: curPrice } : null));
      }
      return;
    }

    // Active Range Measuring Drag
    if (measureBox && measureBox.isDrawing && viewport) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        const curPrice = transforms.yToPrice(y);
        const curTime = transforms.xToTime(x);
        setMeasureBox({
          ...measureBox,
          currentX: x,
          currentY: y,
          currentPrice: curPrice,
          currentTime: curTime,
        });
        if (liquidityEngine) {
          const res = liquidityEngine.measureRange(
            Math.min(measureBox.startPrice, curPrice),
            Math.max(measureBox.startPrice, curPrice),
            Math.min(measureBox.startTime, curTime),
            Math.max(measureBox.startTime, curTime)
          );
          setMeasurementResult(res);
        }
      }
      return;
    }

    // Active Dragging (TradingView Scale Dragging & Panning)
    if (isDragging && dragState && viewport) {
      if (dragState.mode === 'price-scale') {
        // Dragging price scale vertically (TradingView style):
        // Drag UP (dy < 0) -> stretch / zoom in price scale
        // Drag DOWN (dy > 0) -> compress / zoom out price scale
        const dy = y - dragState.startY;
        const factor = Math.exp(dy * 0.005);
        const originalSpan = dragState.maxPrice - dragState.minPrice;
        const newSpan = Math.max(0.10, originalSpan * factor);
        const cursorRatio = Math.max(0.05, Math.min(0.95, (chartH - dragState.startY) / chartH));
        const newMinPrice = dragState.anchorPrice - newSpan * cursorRatio;
        const newMaxPrice = newMinPrice + newSpan;

        setViewport({
          ...viewport,
          minPrice: newMinPrice,
          maxPrice: newMaxPrice,
        });
        return;
      }

      if (dragState.mode === 'time-scale') {
        // Dragging time scale horizontally (TradingView style):
        // Drag RIGHT (dx > 0) -> stretch / zoom in time scale
        // Drag LEFT (dx < 0) -> compress / zoom out time scale
        const dx = x - dragState.startX;
        const factor = Math.exp(-dx * 0.005);
        const originalSpan = dragState.maxTime - dragState.minTime;
        const newSpan = Math.max(10 * tfSec, originalSpan * factor);
        const cursorRatio = Math.max(0.05, Math.min(0.95, dragState.startX / chartW));
        const newMinTime = dragState.anchorTime - newSpan * cursorRatio;
        const newMaxTime = newMinTime + newSpan;

        setViewport({
          ...viewport,
          minTime: newMinTime,
          maxTime: newMaxTime,
        });
        return;
      }

      // Pan mode (panning main chart)
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;

      const timeSpan = dragState.maxTime - dragState.minTime;
      const priceSpan = dragState.maxPrice - dragState.minPrice;

      const timeDelta = (dx / chartW) * timeSpan;
      const priceDelta = (dy / chartH) * priceSpan;

      setViewport({
        minTime: dragState.minTime - timeDelta,
        maxTime: dragState.maxTime - timeDelta,
        minPrice: dragState.minPrice + priceDelta,
        maxPrice: dragState.maxPrice + priceDelta,
      });
      return;
    }

    // Detect hovered Big Trade
    if (viewport) {
      const transforms = getTransforms(rect.width, rect.height, viewport);
      if (transforms) {
        let found: BigTrade | null = null;
        for (const bt of bigTrades) {
          const bx = transforms.timeToX(bt.time / 1000);
          const by = transforms.priceToY(bt.price);
          const radius = Math.max(7, Math.min(36, Math.sqrt(bt.qty) * 2.4));
          const dist = Math.hypot(x - bx, y - by);
          if (dist <= radius + 4) {
            found = bt;
            break;
          }
        }
        setHoveredBigTrade(found);
      }
    }
  };

  const handleMouseUp = () => {
    // Commit Active Drawing Draft
    if (activeDraft) {
      const timeDiff = Math.abs(activeDraft.time2 - activeDraft.time1);
      const priceDiff = Math.abs(activeDraft.price2 - activeDraft.price1);
      if (timeDiff > 0.1 || priceDiff > 0.01) {
        const newDrawing: DrawingItem = {
          id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: activeDraft.type,
          time1: activeDraft.time1,
          price1: activeDraft.price1,
          time2: activeDraft.time2,
          price2: activeDraft.price2,
          color: activeDraft.color,
          lineWidth: 1.5,
          label: activeDraft.type === 'box' ? 'Order Block' : undefined,
          createdAt: Date.now(),
        };
        onUpdateDrawings?.([...drawings, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
      }
      setActiveDraft(null);
      onSelectDrawingTool?.('select');
    }

    if (measureBox && measureBox.isDrawing) {
      setMeasureBox((prev) => (prev ? { ...prev, isDrawing: false } : null));
      if (liquidityEngine && measureBox) {
        const res = liquidityEngine.measureRange(
          Math.min(measureBox.startPrice, measureBox.currentPrice),
          Math.max(measureBox.startPrice, measureBox.currentPrice)
        );
        setMeasurementResult(res);
      }
    }
    setIsDragging(false);
    setDragState(null);
  };

  const handleMouseLeave = () => {
    if (activeDraft) {
      setActiveDraft(null);
      onSelectDrawingTool?.('select');
    }
    setIsDragging(false);
    setDragState(null);
    setHoverPos(null);
    setHoveredBigTrade(null);
  };

  // Double-click handler (TradingView style): auto-fit price or reset view
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartW = rect.width - RIGHT_MARGIN;

    if (x > chartW) {
      // Double clicked on price scale: auto-fit vertical price height to visible candles
      if (!candles || candles.length === 0 || !viewport) return;
      const lastCandle = candles[candles.length - 1];
      const refPrice = lastCandle.close > 0 ? lastCandle.close : (currentPrice > 0 ? currentPrice : 4340);
      let low = Infinity;
      let high = -Infinity;
      for (let i = candles.length - 1; i >= 0; i--) {
        const c = candles[i];
        if (c.time < viewport.minTime - tfSec) break;
        if (c.time <= viewport.maxTime + tfSec) {
          if (Number.isFinite(c.low) && c.low > 0 && c.low >= refPrice * 0.65) {
            if (c.low < low) low = c.low;
          }
          if (Number.isFinite(c.high) && c.high > 0 && c.high <= refPrice * 1.35) {
            if (c.high > high) high = c.high;
          }
        }
      }
      if (low === Infinity || high === -Infinity || low === high || low <= 0) {
        low = refPrice - 0.50;
        high = refPrice + 0.50;
      }
      const padding = Math.max(0.20, (high - low) * 0.18);
      setViewport({
        ...viewport,
        minPrice: Math.max(0.01, low - padding),
        maxPrice: high + padding,
      });
    } else {
      // Double clicked on chart or time scale: reset view & auto-follow
      handleResetView();
    }
  };

  // Zoom with Wheel (TradingView style)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!viewport) return;
    setAutoFollow(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartW = rect.width - RIGHT_MARGIN;
    const chartH = rect.height - BOTTOM_MARGIN;

    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
    const timeSpan = viewport.maxTime - viewport.minTime;
    const priceSpan = viewport.maxPrice - viewport.minPrice;

    // 1. Wheel over right price scale: zoom price axis vertically
    if (x > chartW) {
      const cursorPriceFrac = Math.max(0, Math.min(1, (chartH - y) / chartH));
      const newPriceSpan = Math.max(0.10, priceSpan * zoomFactor);
      const newMinPrice = viewport.minPrice + priceSpan * cursorPriceFrac - newPriceSpan * cursorPriceFrac;
      setViewport({
        ...viewport,
        minPrice: newMinPrice,
        maxPrice: newMinPrice + newPriceSpan,
      });
      return;
    }

    // 2. Wheel over bottom time scale: zoom time axis horizontally
    if (y > chartH) {
      const cursorTimeFrac = Math.max(0, Math.min(1, x / chartW));
      const newTimeSpan = Math.max(10 * tfSec, timeSpan * zoomFactor);
      const newMinTime = viewport.minTime + timeSpan * cursorTimeFrac - newTimeSpan * cursorTimeFrac;
      setViewport({
        ...viewport,
        minTime: newMinTime,
        maxTime: newMinTime + newTimeSpan,
      });
      return;
    }

    // 3. Shift + Wheel: scroll horizontally (TradingView standard)
    if (e.shiftKey) {
      const deltaSec = (e.deltaY / 100) * (timeSpan * 0.08);
      setViewport({
        ...viewport,
        minTime: viewport.minTime + deltaSec,
        maxTime: viewport.maxTime + deltaSec,
      });
      return;
    }

    // 4. Ctrl + Wheel or Alt + Wheel: zoom both time and price (or vertical zoom)
    if (e.ctrlKey || e.altKey) {
      const cursorTimeFrac = Math.max(0, Math.min(1, x / chartW));
      const cursorPriceFrac = Math.max(0, Math.min(1, (chartH - y) / chartH));
      const newTimeSpan = Math.max(10 * tfSec, timeSpan * zoomFactor);
      const newMinTime = viewport.minTime + timeSpan * cursorTimeFrac - newTimeSpan * cursorTimeFrac;
      const newPriceSpan = Math.max(0.10, priceSpan * zoomFactor);
      const newMinPrice = viewport.minPrice + priceSpan * cursorPriceFrac - newPriceSpan * cursorPriceFrac;
      setViewport({
        minTime: newMinTime,
        maxTime: newMinTime + newTimeSpan,
        minPrice: newMinPrice,
        maxPrice: newMinPrice + newPriceSpan,
      });
      return;
    }

    // 5. Normal Wheel over main chart: zoom time axis horizontally centered at cursor (TradingView standard)
    const cursorTimeFrac = Math.max(0, Math.min(1, x / chartW));
    const newTimeSpan = Math.max(10 * tfSec, timeSpan * zoomFactor);
    const newMinTime = viewport.minTime + timeSpan * cursorTimeFrac - newTimeSpan * cursorTimeFrac;

    setViewport({
      ...viewport,
      minTime: newMinTime,
      maxTime: newMinTime + newTimeSpan,
    });
  };

  // Reset view button handler
  const handleResetView = useCallback(() => {
    setAutoFollow(true);
    if (!candles || candles.length === 0) return;
    fitViewportToCandles(candles, tfSec);
  }, [candles, fitViewportToCandles, tfSec]);

  useEffect(() => {
    if (resetViewTrigger && resetViewTrigger > 0) {
      handleResetView();
    }
  }, [resetViewTrigger, handleResetView]);

  // Dynamic TradingView-style cursor
  const getCursorStyle = () => {
    if (measureToolActive) return 'crosshair';
    if (activeDrawingTool && activeDrawingTool !== 'select') return 'crosshair';
    if (isDragging && dragState) {
      if (dragState.mode === 'price-scale') return 'ns-resize';
      if (dragState.mode === 'time-scale') return 'ew-resize';
      return 'grabbing';
    }
    if (hoverPos && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const chartW = width - RIGHT_MARGIN;
      const chartH = height - BOTTOM_MARGIN;
      if (hoverPos.x > chartW && hoverPos.y <= chartH) return 'ns-resize';
      if (hoverPos.y > chartH && hoverPos.x <= chartW) return 'ew-resize';
      return 'crosshair';
    }
    return 'crosshair';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        backgroundColor: settings.backgroundMode === 'solid' ? settings.solidColor : '#11151c',
      }}
    >
      {/* Background Mode: Gradient Underlay */}
      {settings.backgroundMode === 'gradient' && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `linear-gradient(180deg, ${settings.gradientStart} 0%, ${settings.gradientEnd} 100%)`,
          }}
        />
      )}

      {/* Background Mode: Local Image Underlay */}
      {settings.backgroundMode === 'image' && settings.backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center z-0 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${settings.backgroundImage})`,
            opacity: settings.backgroundImageOpacity ?? 0.25,
            filter: `blur(${settings.backgroundImageBlur ?? 0}px)`,
          }}
        />
      )}

      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: getCursorStyle() }}
        className="relative z-10 w-full h-full block"
      />

      {/* Windows XP Drawing Toolbox */}
      <DrawingToolbar
        activeTool={activeDrawingTool}
        onSelectTool={(t) => {
          if (t === 'measure') {
            onToggleMeasureTool?.();
            onSelectDrawingTool?.('select');
          } else {
            onSelectDrawingTool?.(t);
          }
        }}
        currentColor={drawingColor}
        onChangeColor={(c) => onDrawingColorChange?.(c)}
        onUndo={() => {
          if (drawings.length > 0) onUpdateDrawings?.(drawings.slice(0, -1));
        }}
        onClearAll={() => onUpdateDrawings?.([])}
        onDeleteSelected={() => {
          if (selectedDrawingId) {
            onUpdateDrawings?.(drawings.filter((d) => d.id !== selectedDrawingId));
            setSelectedDrawingId(null);
          }
        }}
        hasSelection={!!selectedDrawingId}
        canUndo={drawings.length > 0}
        drawingsCount={drawings.length}
      />

      {/* Windows XP Floating Market Legend Tool Window */}
      <div className="absolute top-3 left-3 flex flex-col bg-[#ece9d8] border-2 border-[#0055ea] rounded-sm shadow-xl z-20 text-slate-900 select-none font-sans text-xs">
        {/* XP Mini Window Titlebar */}
        <div className="bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] text-white px-2 py-0.5 text-[10px] font-bold flex items-center justify-between shadow-sm cursor-move">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="tracking-wide">Market Legend - {symbol} [{timeframe.toUpperCase()}]</span>
          </div>
          <button
            onClick={handleResetView}
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition-all border ${
              autoFollow
                ? 'bg-[#3cb371] text-white border-white/60 shadow-sm'
                : 'bg-white/20 hover:bg-white/40 text-white border-transparent'
            }`}
            title="Auto-follow recent price & reset zoom"
          >
            {autoFollow ? '● Auto' : 'Reset'}
          </button>
        </div>

        {/* XP Mini Window Content */}
        <div className="px-2 py-1 flex items-center gap-2.5 text-[11px] bg-[#ece9d8]">
          <span className="font-bold text-[#0055ea] font-mono">{symbol}</span>
          <span className="text-[#aca899]">|</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-sky-500 border border-slate-700 inline-block" />
              <span className="text-slate-700 text-[10px]">Limit Wall</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-700 inline-block" />
              <span className="text-slate-700 text-[10px]">Fill Buy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-700 inline-block" />
              <span className="text-slate-700 text-[10px]">Fill Sell</span>
            </div>
          </div>

          {measureToolActive && (
            <>
              <span className="text-[#aca899]">|</span>
              <span className="text-[#d97706] font-bold text-[10px] animate-pulse flex items-center gap-1">
                <span>📐 Measuring</span>
                {onToggleMeasureTool && (
                  <button onClick={onToggleMeasureTool} className="text-slate-500 hover:text-black">✕</button>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Windows XP Tooltip for Big Trade Hover */}
      {hoveredBigTrade && hoverPos && (
        <div
          className="absolute pointer-events-none z-30 bg-[#ffffe1] border border-black p-2 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] text-slate-900 text-xs font-sans select-none"
          style={{
            left: Math.min(window.innerWidth - 240, hoverPos.x + 16),
            top: Math.max(10, hoverPos.y - 70),
          }}
        >
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-[#aca899]">
            <span
              className={`font-bold uppercase px-1 py-0.2 rounded-[1px] text-[10px] ${
                hoveredBigTrade.side === 'buy' ? 'bg-[#ecfdf5] text-[#008000] border border-[#86efac]' : 'bg-[#fff1f2] text-[#c00000] border-[#fca5a5]'
              }`}
            >
              BIG TRADE ({hoveredBigTrade.side.toUpperCase()})
            </span>
            <span className="font-mono text-slate-600 text-[10px]">
              {new Date(hoveredBigTrade.time).toLocaleTimeString()}
            </span>
          </div>
          <div className="space-y-0.5 font-mono text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Price:</span>
              <span className="font-bold text-slate-950">${hoveredBigTrade.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Contracts:</span>
              <span className="font-bold text-[#b45309]">{hoveredBigTrade.qty.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Total Value:</span>
              <span className="font-bold text-[#008000]">
                ${(hoveredBigTrade.price * hoveredBigTrade.qty).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Windows XP Interactive Range Measurement Tool Window */}
      {measurementResult && measureBox && (
        <div
          className="absolute z-30 bg-[#ece9d8] border-2 border-[#0055ea] rounded-t-sm rounded-b-none shadow-2xl text-xs font-sans max-w-sm select-none"
          style={{
            left: Math.min(window.innerWidth - 380, Math.max(20, Math.min(measureBox.startX, measureBox.currentX) + 12)),
            top: Math.max(50, Math.min(measureBox.startY, measureBox.currentY) - 150),
          }}
        >
          {/* XP Mini Window Titlebar */}
          <div className="bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] text-white px-2 py-0.5 font-bold text-[11px] flex items-center justify-between shadow-sm cursor-move">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Liquidity Zone Ruler</span>
            </div>
            <button
              onClick={() => {
                setMeasureBox(null);
                setMeasurementResult(null);
              }}
              className="w-4 h-4 rounded-[1px] bg-[#e81123] hover:bg-[#f13847] text-white font-bold flex items-center justify-center text-[10px] border border-white/40"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-2 space-y-1.5 text-slate-900">
            {/* Price Span Inset Panel */}
            <div className="bg-white border-t border-l border-[#808080] border-r border-b border-white p-1.5 rounded-[1px] flex items-center justify-between text-[11px] font-mono shadow-inner">
              <span className="text-slate-800 font-bold">
                ${measurementResult.minPrice.toFixed(2)} - ${measurementResult.maxPrice.toFixed(2)}
              </span>
              <span className="text-[#0055ea] font-bold">
                Δ {measurementResult.priceSpan.toFixed(2)} pts
              </span>
            </div>

            {/* Details Grid - Sunken Win32 Panels */}
            <div className="space-y-1 text-[10px] font-sans bg-white border-t border-l border-[#808080] border-r border-b border-white p-1.5 rounded-[1px] shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Resting Buy Limits:</span>
                <span className="text-[#008000] font-bold font-mono">
                  {measurementResult.totalRestingBuy.toFixed(1)} XAU ({measurementResult.restingBuyCount} lvls)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Resting Sell Limits:</span>
                <span className="text-[#c00000] font-bold font-mono">
                  {measurementResult.totalRestingSell.toFixed(1)} XAU ({measurementResult.restingSellCount} lvls)
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#ece9d8]">
                <span className="text-slate-600">SL/TP Pools in Zone:</span>
                <span className="text-[#0055ea] font-bold font-mono">
                  {measurementResult.pools.length} Pools ({measurementResult.pools.filter(p => !p.isSwept).length} Active)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Orders Swept / Filled:</span>
                <span className="text-[#b45309] font-bold font-mono">
                  {measurementResult.totalFilledVolume.toFixed(1)} XAU
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 pl-2">
                <span>↳ Buy: <strong className="text-[#008000] font-mono">{measurementResult.buyFillVolume.toFixed(1)}</strong></span>
                <span>↳ Sell: <strong className="text-[#c00000] font-mono">{measurementResult.sellFillVolume.toFixed(1)}</strong></span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#ece9d8]">
                <span className="text-slate-600">Volume Delta:</span>
                <span className={`font-bold font-mono ${measurementResult.netDelta >= 0 ? 'text-[#008000]' : 'text-[#c00000]'}`}>
                  {measurementResult.netDelta >= 0 ? '+' : ''}{measurementResult.netDelta.toFixed(1)} XAU
                </span>
              </div>

              {measurementResult.recentSweeps.length > 0 && (
                <div className="pt-1 border-t border-[#ece9d8] text-[#b45309] font-semibold flex items-center gap-1 text-[9px]">
                  <span>⚡ {measurementResult.recentSweeps.length} Swept Events in range</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
