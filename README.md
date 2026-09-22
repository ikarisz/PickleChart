<div align="center">

# 🥒 PickleChart

### *The High-Performance, Windows XP Edition Order Flow & Liquidity Trading Terminal*

<p align="center">
  <a href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart" target="_blank" rel="noopener">
    <img src="https://www.toryod.co/badge/173ef2d4-7369-41e0-be4c-30719920b7ad" alt="Featured on TorYod" height="54" />
  </a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Local First](https://img.shields.io/badge/Architecture-100%25%20Local--First-emerald)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

**PickleChart** is an ultra-responsive, low-friction, open-source market terminal designed for active order flow traders, scalpers, and technical analysts. Built on hardware-accelerated **HTML5 Canvas** and wrapped in an authentic, nostalgic **Windows XP Luna** desktop shell, PickleChart brings institutional-grade liquidity radar, trade clustering, and deep customization straight to your browser with zero latency.

[Key Features](#-key-features) •
[Quick Start](#-quick-start) •
[Keyboard Shortcuts](#-keyboard-shortcuts) •
[Architecture](#-architecture) •
[Local-First & Presets](#-local-first--customization) •
[License](#-license)

---

</div>

## ✨ Key Features

### 1. 🥒 Authentic Windows XP Luna Experience
- **Nostalgic Win32 Desktop Shell**: Features classic Luna Blue, Royale Noir, and Metallic visual styles with authentic Tahoma typography, beveled window borders, and control buttons (`_ □ ✕`).
- **Green Start Menu & Taskbar**: Fully functional Windows XP Start Menu with Quick Presets launcher, asset switcher, and active taskbar bevel with live system tray clock and network status.
- **Win32 Sunken ListViews**: All data tables (DOM ladder, Big Trades tape, Swept Orders, Limit Walls) feature authentic `SysListView32` 3D inset borders, alternating row striping, and Windows XP blue hover highlights.
- **Command Rebar & Status Bar**: Rebar grippers (`:::`), native comboboxes, and bottom window status bar with volume delta and live tick metrics.

### 2. ⚡ Real-Time Order Flow & Market Microstructure
- **Sub-Second WebSocket Feeds**: Connects directly to high-throughput WebSocket streams (Binance Futures/Perpetual) with automatic reconnection and micro-batched 20 FPS UI state rendering.
- **3D Big Trade Spheres**: Real-time trade clustering calculates buyer vs. seller aggressor volume ratios, rendering 3D specular volume spheres with expanding age ripples and acoustic trade alerts.
- **Depth of Market (DOM) Ladder**: Live bid/ask resting liquidity ladder with volume bars, cumulative size, and instant spread analysis.
- **Sub-Minute Candlestick Aggregation**: Ultra-granular timeframes (1s, 5s, 15s, 30s, 1m, 5m, 15m, 1h, 4h) generated dynamically in-memory.

### 3. 🧱 Liquidity Radar & Smart Money Tracking
- **Resting Limit Walls**: Detects large resting buy/sell orders and iceberg defense walls across the book.
- **Liquidity Pools (SL / TP)**: Identifies swing highs/lows where stop-loss clusters and breakout liquidity pool orders congregate.
- **Swept Order Markers**: Pinpoints aggressive institutional order sweeps and stop runs where liquidity has been consumed.
- **Liquidity Range Ruler**: Built-in interactive box measuring price distance, time elapsed, resting volume, swept volume, and net buy/sell ratio inside any selected zone.

### 4. 🎨 Native Canvas Drawing Tools
- **Select & Move (`V`)**: Select, inspect, and adjust drawings with visual selection handles.
- **Trendline (`T`)**: Dynamic angled trendlines connecting swing points.
- **Horizontal Ray (`H`)**: Single-click ray levels with right-margin price badges.
- **Order Block / Box (`B`)**: Mark fair value gaps, liquidity blocks, and supply/demand zones with customizable fill opacity.
- **Fibonacci Retracements (`F`)**: Golden ratio retracements (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%).
- **Text Callout (`N`)**: Annotate key setups and breakout levels.
- **Undo (`Ctrl+Z`) & Delete (`Del` / `Backspace`)**: Low-friction drawing workflow.

### 5. 📈 Real-Time Technical Indicators
- **Exponential Moving Averages**: EMA 9, EMA 21, EMA 50, and EMA 200 with customizable colors and line weights.
- **Session VWAP**: Volume-Weighted Average Price benchmark with dashed styling.
- **Bollinger Bands**: 20-period SMA with 2-standard-deviation bands and translucent channel fill.

### 6. 💾 100% Local-First & Customization
- **No Account Required**: Runs entirely in the client. All settings, drawing coordinates, and presets are saved to browser `localStorage`.
- **Custom Background Images**: Upload any wallpaper from your computer (stored as Base64) with live opacity and background blur sliders.
- **Preset System & JSON Import/Export**: Save unlimited custom workspace presets, export them to `.json` files to share with the community, or import community presets with a single click.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ikarisz/PickleChart.git

# 2. Navigate to project directory
cd PickleChart

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000/`.

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Tool / Action | Description |
| :--- | :--- | :--- |
| <kbd>V</kbd> | **Select Tool** | Inspect and manipulate existing drawings |
| <kbd>T</kbd> | **Trendline** | Draw dynamic angled trendlines |
| <kbd>H</kbd> | **Horizontal Ray** | Place instant horizontal ray with price tag |
| <kbd>B</kbd> | **Order Block / Box** | Draw liquidity zones and FVG boxes |
| <kbd>F</kbd> | **Fibonacci** | Draw multi-level Fibonacci retracements |
| <kbd>N</kbd> | **Text Note** | Add a callout or trade note at click position |
| <kbd>M</kbd> | **Range Ruler** | Toggle interactive liquidity measurement box |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | **Undo** | Remove the most recently placed drawing |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | **Delete** | Delete the currently selected drawing |
| <kbd>Esc</kbd> | **Cancel / Reset** | Cancel active tool and return to Select mode |

---

## 🏗️ Architecture

```
PickleChart/
├── index.html                  # HTML entry point with cucumber favicon (🥒)
├── package.json                # Project dependencies and build scripts
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS styling with XP extensions
└── src/
    ├── App.tsx                 # Main application shell with XP desktop layout
    ├── index.css               # Global Tahoma typography & Win32 scrollbars
    ├── types/
    │   ├── market.ts           # Market ticks, trades, candles, and book types
    │   ├── liquidity.ts        # Liquidity walls, pools, and swept events
    │   ├── drawing.ts          # Drawing primitives, coordinates, and types
    │   └── settings.ts         # Appearance, indicators, and preset schemas
    ├── services/
    │   ├── binanceService.ts   # Binance WebSocket & REST API client
    │   ├── candleAggregator.ts # Sub-second and multi-timeframe candle builder
    │   ├── tradeClusterEngine.ts # Real-time 3D trade ball aggregator
    │   ├── liquidityEngine.ts  # Limit wall, SL/TP pool & sweep detector
    │   ├── indicatorEngine.ts  # EMA, VWAP, and Bollinger Bands calculation
    │   ├── settingsStorage.ts  # Local-first storage, JSON export/import
    │   └── audioAlert.ts       # Web Audio API acoustic chimes
    └── components/
        ├── XP/
        │   ├── XPTitleBar.tsx  # Classic title bar with cucumber logo & menus
        │   └── XPStartMenu.tsx # Authentic green Start button & popup menu
        ├── Header/
        │   └── TerminalHeader.tsx # XP Command Rebar with symbol & filters
        ├── Chart/
        │   ├── CanvasChart.tsx # 60 FPS HTML5 Canvas engine & drawing layer
        │   └── DrawingToolbar.tsx # Floating XP Luna toolbox
        ├── DOM/
        │   └── DepthOfMarket.tsx # Win32 sunken order ladder & spread bar
        ├── BigTrades/
        │   └── BigTradeTape.tsx # Real-time trade feed with XP progress bar
        ├── Liquidity/
        │   └── LiquidityRadar.tsx # Liquidity pool tables & swept orders log
        ├── OrderFlow/
        │   └── OrderFlowStats.tsx # Win32 status bar with volume delta
        └── Settings/
            └── ChartSettingsModal.tsx # "Display Properties" tabbed dialog
```

---

## 🛡️ Supported Assets

PickleChart supports real-time streaming for premier crypto and macro perpetual futures:

| Symbol | Name | Tick Size | Default Trade Threshold |
| :--- | :--- | :---: | :---: |
| **XAUUSDT** | Gold Spot / Perpetual | `0.01` | `2.0 contracts` |
| **BTCUSDT** | Bitcoin Perpetual | `0.10` | `5.0 BTC` |
| **ETHUSDT** | Ethereum Perpetual | `0.01` | `30.0 ETH` |
| **SOLUSDT** | Solana Perpetual | `0.01` | `200.0 SOL` |
| **NQ1!** | NASDAQ 100 E-mini | `0.25` | `10.0 contracts` |
| **ES1!** | S&P 500 E-mini | `0.25` | `25.0 contracts` |

---

## 🤝 Contributing

Contributions from the open-source community are warmly welcomed!

1. **Fork the repository**
2. **Create your feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.

---

<div align="center">
Made with 🥒 and nostalgic love for the golden age of computing.
</div>
