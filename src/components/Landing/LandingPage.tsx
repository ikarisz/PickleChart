import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Play,
  Github,
  Award,
  Layers,
  Zap,
  ShieldCheck,
  Palette,
  Terminal,
  Code,
  Activity,
  Box,
  CheckCircle2,
} from 'lucide-react';

interface LandingPageProps {
  onLaunchTerminal: () => void;
  onOpenSettings?: () => void;
  symbol?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchTerminal,
  onOpenSettings,
  symbol = 'XAUUSDT',
}) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'features' | 'architecture' | 'comparison' | 'community'>('overview');

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#ece9d8] text-slate-900 font-sans select-none overflow-hidden">
      {/* 1. Classic Windows XP Explorer Title Bar */}
      <div className="h-7 px-2.5 bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] text-white flex items-center justify-between shadow-sm shrink-0 border-b border-[#003fb5]">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none drop-shadow-sm select-none">🥒</span>
          <span className="font-bold text-[12px] tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            PickleChart - Open Source Windows XP Order Flow Terminal [Welcome Center]
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onLaunchTerminal}
            className="h-5 px-2 bg-gradient-to-b from-[#38b000] to-[#007200] hover:brightness-110 active:brightness-90 text-white rounded text-[10px] font-bold shadow flex items-center gap-1 border border-[#004b00]"
            title="Launch Trading Terminal"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Launch App</span>
          </button>
          <div className="w-5 h-5 rounded-[3px] bg-[#d9482b] hover:bg-[#e8583b] active:bg-[#b83820] flex items-center justify-center text-white border border-[#802010] shadow-inner text-[11px] font-bold">
            ✕
          </div>
        </div>
      </div>

      {/* 2. Windows XP Classic Menu Bar */}
      <div className="h-6 bg-[#ece9d8] border-b border-[#aca899] px-2 flex items-center gap-4 text-xs shrink-0 select-none text-black">
        <span className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm">File</span>
        <span className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm">Edit</span>
        <span className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm">View</span>
        <span className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm">Favorites</span>
        <span
          onClick={onOpenSettings}
          className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm"
        >
          Tools
        </span>
        <a
          href="https://github.com/ikarisz/PickleChart"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm font-semibold flex items-center gap-1 text-slate-800"
        >
          <Github className="w-3 h-3" />
          <span>GitHub Repo</span>
        </a>
        <a
          href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer hover:bg-[#316ac5] hover:text-white px-1.5 py-0.5 rounded-sm font-semibold text-emerald-800 flex items-center gap-1"
        >
          <Award className="w-3 h-3" />
          <span>TorYod Project</span>
        </a>
        <button
          onClick={onLaunchTerminal}
          className="ml-auto text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>Open Terminal ({symbol})</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 3. Primary Windows XP Rebar / Navigation Bar (Contains TorYod Badge & GitHub) */}
      <div className="bg-[#ece9d8] border-b border-[#aca899] px-2 py-1 flex items-center justify-between gap-2 shrink-0 flex-wrap shadow-sm">
        {/* Left: XP Explorer Nav Buttons */}
        <div className="flex items-center gap-1">
          {/* Back Button */}
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#f5f3e8] active:bg-[#dfdbcc] border border-transparent hover:border-[#aca899] text-xs text-slate-700"
            title="Go to Overview"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#8fd158] to-[#458b16] flex items-center justify-center text-white shadow-sm border border-[#3b7912]">
              <ArrowLeft className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold">Back</span>
          </button>

          {/* Forward Button */}
          <button
            onClick={() => setActiveTab('features')}
            className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#f5f3e8] active:bg-[#dfdbcc] border border-transparent hover:border-[#aca899] text-xs text-slate-700"
            title="Go to Features"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#8fd158] to-[#458b16] flex items-center justify-center text-white shadow-sm border border-[#3b7912]">
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </div>
          </button>

          {/* Separator */}
          <div className="h-5 w-[1px] bg-[#aca899] mx-1" />

          {/* Explorer Quick Actions */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
              activeTab === 'overview'
                ? 'bg-[#ffffff] border-[#7f9db9] shadow-inner font-bold'
                : 'bg-[#ece9d8] border-[#aca899] hover:bg-[#f9f8f4]'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>Welcome</span>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
              activeTab === 'features'
                ? 'bg-[#ffffff] border-[#7f9db9] shadow-inner font-bold'
                : 'bg-[#ece9d8] border-[#aca899] hover:bg-[#f9f8f4]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Features</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
              activeTab === 'architecture'
                ? 'bg-[#ffffff] border-[#7f9db9] shadow-inner font-bold'
                : 'bg-[#ece9d8] border-[#aca899] hover:bg-[#f9f8f4]'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-emerald-600" />
            <span>Architecture</span>
          </button>
        </div>

        {/* Center: Address Bar */}
        <div className="flex-1 max-w-sm min-w-[200px] flex items-center gap-1.5">
          <span className="text-[11px] text-slate-700 font-sans">Address</span>
          <div className="flex-1 h-6 bg-white border border-[#7f9db9] rounded-sm px-2 flex items-center gap-1 shadow-inner text-xs">
            <span className="text-xs">🥒</span>
            <span className="truncate text-slate-800 font-mono text-[11px]">https://picklechart.org/open-source</span>
          </div>
          <button
            onClick={onLaunchTerminal}
            className="h-6 px-2 bg-gradient-to-b from-[#f2efe4] to-[#dfdbcc] hover:bg-[#ebe6d6] active:bg-[#cac5b4] border border-[#aca899] rounded text-[11px] font-bold text-slate-800 shadow-sm flex items-center gap-0.5"
            title="Launch Terminal"
          >
            <span>Go</span>
            <ArrowRight className="w-3 h-3 text-emerald-700" />
          </button>
        </div>

        {/* Right Nav: TorYod Badge, GitHub Button & Launch App CTA */}
        <div className="flex items-center gap-2">
          {/* USER SPECIFIED TORYOD BADGE */}
          <div className="flex items-center" title="Featured on TorYod">
            <a
              href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-90 active:scale-95 transition-all block"
            >
              <img
                src="https://www.toryod.co/badge/173ef2d4-7369-41e0-be4c-30719920b7ad"
                alt="Featured on TorYod"
                height="54"
                className="h-8 sm:h-9 object-contain drop-shadow-sm"
              />
            </a>
          </div>

          {/* GitHub Star Button */}
          <a
            href="https://github.com/ikarisz/PickleChart"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-2.5 bg-gradient-to-b from-[#ffffff] via-[#f0eeea] to-[#dfdac8] hover:bg-[#f8f7f4] active:bg-[#ceca7] border border-[#7f9db9] rounded text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all group"
            title="Star PickleChart on GitHub"
          >
            <Github className="w-3.5 h-3.5 text-slate-900 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Star on GitHub</span>
            <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-normal">⭐ Repo</span>
          </a>

          {/* Vibrant Windows XP Launch Terminal CTA Button */}
          <button
            onClick={onLaunchTerminal}
            className="h-8 px-3.5 bg-gradient-to-b from-[#40c057] via-[#2f9e44] to-[#2b8a3e] hover:brightness-110 active:brightness-90 text-white rounded text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.3)] border border-[#237032] flex items-center gap-1.5 cursor-pointer animate-pulse"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Live Terminal</span>
          </button>
        </div>
      </div>

      {/* 4. Main Explorer Body (Scrollable Windows XP Layout) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Explorer Sidebar (Classic Windows XP Task Pane) */}
        <aside className="w-60 shrink-0 bg-gradient-to-b from-[#7ba2e7] via-[#6375d6] to-[#4557b5] p-2.5 flex flex-col gap-3 overflow-y-auto hidden md:flex text-white select-none">
          {/* Sidebar Section 1: Quick Navigation */}
          <div className="bg-white rounded-t-sm shadow-md overflow-hidden text-slate-900">
            <div className="bg-gradient-to-r from-[#215dc6] to-[#3a75e0] text-white px-2.5 py-1 text-xs font-bold flex items-center justify-between">
              <span>Pickle Tasks</span>
              <span className="text-[10px] opacity-80">▲</span>
            </div>
            <div className="p-2 space-y-1 text-xs bg-[#d3e5fa]">
              <button
                onClick={onLaunchTerminal}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#bed6f7] text-[#003fb5] font-bold flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
                <span>Launch Live Terminal</span>
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className="w-full text-left px-2 py-1 rounded hover:bg-[#bed6f7] text-[#003fb5] flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Order Flow Features</span>
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className="w-full text-left px-2 py-1 rounded hover:bg-[#bed6f7] text-[#003fb5] flex items-center gap-2"
              >
                <Code className="w-3.5 h-3.5 text-purple-600" />
                <span>Technical Architecture</span>
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className="w-full text-left px-2 py-1 rounded hover:bg-[#bed6f7] text-[#003fb5] flex items-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Why Open Source?</span>
              </button>
            </div>
          </div>

          {/* Sidebar Section 2: External Links */}
          <div className="bg-white rounded-t-sm shadow-md overflow-hidden text-slate-900">
            <div className="bg-gradient-to-r from-[#215dc6] to-[#3a75e0] text-white px-2.5 py-1 text-xs font-bold flex items-center justify-between">
              <span>Project Links</span>
              <span className="text-[10px] opacity-80">▲</span>
            </div>
            <div className="p-2 space-y-1.5 text-xs bg-[#d3e5fa]">
              <a
                href="https://github.com/ikarisz/PickleChart"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#003fb5] hover:underline px-1 py-0.5"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
              </a>
              <a
                href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#003fb5] hover:underline px-1 py-0.5 font-bold"
              >
                <Award className="w-3.5 h-3.5 text-emerald-700" />
                <span>Featured on TorYod</span>
              </a>
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#003fb5] hover:underline px-1 py-0.5 text-[11px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                <span>MIT Open Source License</span>
              </a>
            </div>
          </div>

          {/* Sidebar Section 3: Project System Details */}
          <div className="bg-white rounded-t-sm shadow-md overflow-hidden text-slate-900">
            <div className="bg-gradient-to-r from-[#215dc6] to-[#3a75e0] text-white px-2.5 py-1 text-xs font-bold flex items-center justify-between">
              <span>System Information</span>
              <span className="text-[10px] opacity-80">▲</span>
            </div>
            <div className="p-2 text-[11px] space-y-1 bg-[#d3e5fa] text-slate-700">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-bold text-slate-900">v1.0.0 XP</span>
              </div>
              <div className="flex justify-between">
                <span>Rendering:</span>
                <span className="font-bold text-emerald-700">60 FPS Canvas</span>
              </div>
              <div className="flex justify-between">
                <span>Stream Feed:</span>
                <span className="font-bold text-sky-700">Binance WS</span>
              </div>
              <div className="flex justify-between">
                <span>Storage:</span>
                <span className="font-bold text-amber-700">100% Local-First</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area (White Canvas / Document Scroll) */}
        <main className="flex-1 bg-white overflow-y-auto p-4 sm:p-6 space-y-8 select-text">
          {/* 5. Hero Banner: Nostalgic Windows XP Welcome Screen */}
          <section className="bg-gradient-to-r from-[#eef4ff] via-[#f7faff] to-[#ffffff] border-2 border-[#7f9db9] rounded-lg p-5 sm:p-7 shadow-md relative overflow-hidden">
            {/* Background Decorative XP Curves */}
            <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-blue-100/50 via-emerald-100/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100/80 border border-blue-300 text-blue-800 text-xs font-bold shadow-sm">
                  <span className="text-sm">🥒</span>
                  <span>Windows XP Edition • Open Source Order Flow Terminal</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-sans">
                  Institutional Order Flow.
                  <br />
                  <span className="text-[#0055ea]">Nostalgic Zero-Friction Speed.</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  **PickleChart** คือแพลตฟอร์มวิเคราะห์สภาพคล่องและคำสั่งซื้อขาย (Order Flow & Liquidity Intelligence)
                  ระดับสถาบันแบบ **Open Source 100%** ที่รันบน **HTML5 Canvas 60 FPS** และถ่ายทอดจิตวิญญาณแห่งความเร็ว
                  ความเรียบง่าย และไร้สิ่งรบกวนของ **Windows XP Luna** ให้คุณเปิดผ่านเบราว์เซอร์แล้วเทรดได้ทันที!
                </p>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free & Open Source (MIT)
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-600" /> Sub-Second Candlesticks (1s - 15s)
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 100% Local-First Privacy
                  </span>
                </div>
              </div>

              {/* Hero Right: Action Card */}
              <div className="w-full lg:w-72 shrink-0 bg-[#ece9d8] border-2 border-[#aca899] rounded-md p-4 shadow-lg flex flex-col gap-3">
                <div className="text-center pb-2 border-b border-[#aca899]">
                  <div className="text-3xl mb-1">🥒</div>
                  <div className="font-bold text-sm text-slate-900">PickleChart v1.0.0</div>
                  <div className="text-[11px] text-slate-600">Binance Futures Live Terminal</div>
                </div>

                <button
                  onClick={onLaunchTerminal}
                  className="w-full py-2.5 px-4 bg-gradient-to-b from-[#38b000] via-[#007200] to-[#004b00] hover:brightness-110 active:brightness-95 text-white font-bold text-sm rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.3)] border border-[#003500] flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Terminal Now</span>
                </button>

                <a
                  href="https://github.com/ikarisz/PickleChart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-[#7f9db9] rounded text-xs font-bold text-slate-800 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Github className="w-4 h-4" />
                  <span>View GitHub Repository</span>
                </a>

                <a
                  href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Featured on TorYod 🏆</span>
                </a>
              </div>
            </div>
          </section>

          {/* 6. Core Features Section (Win32 Explorer Tiles) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#0055ea] pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span>จุดเด่นและฟังก์ชันการทำงานหลัก (Core Features)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Institutional Grade / Zero Bloat</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Feature 1 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">1. 3D Big Trade Spheres</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ตรวจจับคำสั่งซื้อขายไม้ใหญ่ (Aggressive Market Orders) คำนวณอัตราส่วน Buyer vs Seller Aggression
                  แสดงเป็นลูกบอล 3 มิติพร้อมแสงเงาและคลื่นเสียงเตือนแบบไดนามิก
                </p>
                <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                  ✔ Trade Clustering • Buy/Sell Split • Audio Chimes
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">2. Liquidity Radar & Stop Hunt</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สแกนกำแพงคำสั่ง Limit Wall, จุดซุ่มวาง Stop Loss / Take Profit และตรวจจับ Order Swept
                  (จังหวะที่สภาพคล่องถูกกวาด) ให้คุณเห็นโครงสร้างตลาดอย่างโปร่งใส
                </p>
                <div className="text-[11px] font-mono text-blue-700 bg-blue-50 p-1.5 rounded border border-blue-200">
                  ✔ Limit Defense Walls • SL/TP Pools • Sweep Markers
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">3. 60 FPS Canvas & Sub-Second Candles</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เรนเดอร์กราฟด้วย Native HTML5 Canvas วิ่งนิ่งที่ 60 FPS พร้อมบัฟเฟอร์แยกความถี่ (Micro-batching)
                  สังเคราะห์แท่งเทียนระดับ 1s, 5s, 15s จาก Raw Ticks โดยตรง
                </p>
                <div className="text-[11px] font-mono text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                  ✔ 1s - 15s Granularity • Ref Buffer • Zero Lag
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700">
                  <Box className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">4. Native Canvas Drawing Tools</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  กล่องเครื่องมือวาดลอยตัวสไตล์ Windows XP: เส้นแนวโน้ม (Trendline), กล่อง Order Block / FVG,
                  Fibonacci Retracement, Horizontal Rays และไม้บรรทัดวัดโซน (Range Ruler)
                </p>
                <div className="text-[11px] font-mono text-purple-700 bg-purple-50 p-1.5 rounded border border-purple-200">
                  ✔ Shortcut Keys (V, T, H, B, F, M) • Undo/Delete
                </div>
              </div>

              {/* Feature 5 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700">
                  <Palette className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">5. 100% Local-First & Customization</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  อัปโหลดภาพพื้นหลังจากเครื่องคอมพิวเตอร์ของคุณเอง (Base64) ปรับความเบลอและความทึบแสงได้อิสระ
                  พร้อมระบบบันทึก Preset และ Import / Export ไฟล์ `.json` ได้เอง
                </p>
                <div className="text-[11px] font-mono text-sky-700 bg-sky-50 p-1.5 rounded border border-sky-200">
                  ✔ Custom Wallpapers • JSON Presets • Zero Cloud Lock
                </div>
              </div>

              {/* Feature 6 */}
              <div className="bg-[#f9f9f9] border border-[#d0d0d0] hover:border-[#0055ea] rounded p-4 shadow-sm transition-all hover:shadow-md space-y-2.5">
                <div className="w-9 h-9 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">6. Authentic Win32 Sunken UI</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สัมผัสประสบการณ์ Windows XP Luna ที่สร้างขึ้นใหม่อย่างประณีต: ตาราง `SysListView32` ขอบยุบ 3 มิติ,
                  แถบ Rebar พร้อมจุดจับ (`:::`), ฟอนต์ Tahoma แท้ และปุ่ม Start สีเขียว
                </p>
                <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                  ✔ Luna Blue • Royale Noir • Metallic • Win32 DOM
                </div>
              </div>
            </div>
          </section>

          {/* 7. Technical Architecture & Data Flow */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#0055ea] pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <span>สถาปัตยกรรมทางเทคนิค (Technical Architecture)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">React 18 + Vite + HTML5 Canvas</span>
            </div>

            <div className="bg-[#f4f7fb] border border-[#c5d3e8] rounded-md p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
                {/* Step 1 */}
                <div className="bg-white p-3 rounded border border-[#d0d8e8] shadow-sm space-y-1">
                  <div className="text-xs font-bold text-blue-700 font-mono">LAYER 1</div>
                  <div className="font-bold text-sm text-slate-800">Binance WebSocket</div>
                  <p className="text-[11px] text-slate-500">Live ticks, trade executions & 500-level depth snapshots</p>
                </div>

                {/* Step 2 */}
                <div className="bg-white p-3 rounded border border-[#d0d8e8] shadow-sm space-y-1">
                  <div className="text-xs font-bold text-amber-700 font-mono">LAYER 2</div>
                  <div className="font-bold text-sm text-slate-800">Ref Micro-Batching</div>
                  <p className="text-[11px] text-slate-500">In-memory buffer handles 2,000+ trades/sec at smooth 20 FPS flush</p>
                </div>

                {/* Step 3 */}
                <div className="bg-white p-3 rounded border border-[#d0d8e8] shadow-sm space-y-1">
                  <div className="text-xs font-bold text-emerald-700 font-mono">LAYER 3</div>
                  <div className="font-bold text-sm text-slate-800">Clustering & Liquidity</div>
                  <p className="text-[11px] text-slate-500">Calculates taker ratios, resting walls, and stop sweeps</p>
                </div>

                {/* Step 4 */}
                <div className="bg-white p-3 rounded border border-[#d0d8e8] shadow-sm space-y-1">
                  <div className="text-xs font-bold text-purple-700 font-mono">LAYER 4</div>
                  <div className="font-bold text-sm text-slate-800">60 FPS Canvas UI</div>
                  <p className="text-[11px] text-slate-500">GPU-accelerated dual canvas with Win32 ListView DOM ladder</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white p-3 rounded border border-[#d0d8e8] leading-relaxed">
                💡 **ทำไม PickleChart ถึงลื่นไหล ไม่กระตุก?**:
                เนื่องจากเราใช้สถาปัตยกรรม **Micro-Batching Buffer** ควบคู่กับ **Native Canvas 2D Rendering Engine**
                ทำให้ React ไม่ต้อง Re-render DOM ทุกครั้งที่ Order เข้ามา ส่งผลให้ Memory Footprint ต่ำมาก และเปิดรันได้ตลอด 24 ชั่วโมงโดยไม่ค้าง
              </div>
            </div>
          </section>

          {/* 8. Comparison: PickleChart vs Proprietary Tools */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#0055ea] pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <span>เปรียบเทียบ PickleChart กับซอฟต์แวร์แบบปิดทั่วไป</span>
              </h2>
            </div>

            <div className="border border-[#aca899] rounded overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#ece9d8] border-b border-[#aca899] text-slate-900">
                  <tr>
                    <th className="p-2.5 font-bold">ฟังก์ชัน / ความสามารถ</th>
                    <th className="p-2.5 font-bold text-emerald-800 bg-emerald-50/50">🥒 PickleChart (Open Source)</th>
                    <th className="p-2.5 font-bold text-slate-600">ซอฟต์แวร์การค้าทั่วไป (Commercial)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold">ค่าบริการใช้งาน (Pricing)</td>
                    <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">ฟรี 100% ตลอดชีพ (MIT License)</td>
                    <td className="p-2.5 text-rose-600">มีค่าบริการรายเดือน $50 - $120 / เดือน</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold">การติดตั้ง (Installation)</td>
                    <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">Zero Setup (เปิดผ่านเบราว์เซอร์ได้ทันที)</td>
                    <td className="p-2.5 text-slate-600">ต้องติดตั้งโปรแกรมขนาดใหญ่ลงเครื่อง</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold">ความเป็นส่วนตัว (Privacy)</td>
                    <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">100% Local-First (บันทึกลงเครื่องผู้ใช้)</td>
                    <td className="p-2.5 text-slate-600">บังคับส่งข้อมูลขึ้น Cloud ของผู้ให้บริการ</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-2.5 font-semibold">การต่อยอด (Customizability)</td>
                    <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">เปิดโค้ดให้ Fork, แก้ไข และเพิ่มฟีเจอร์อิสระ</td>
                    <td className="p-2.5 text-slate-600">Closed-source ปิดกั้นการพัฒนา</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 9. Open Source Community & TorYod Callout */}
          <section className="bg-gradient-to-r from-[#f0fdf4] via-[#ecfdf5] to-[#f0fdf4] border-2 border-emerald-400 rounded-lg p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-emerald-800" />
                <span>TorYod Open Source Showcase</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
                ร่วมสนับสนุนและเป็นส่วนหนึ่งของ PickleChart
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 max-w-xl leading-relaxed">
                โปรเจกต์นี้จัดทำขึ้นเพื่อให้คอมมูนิตี้เทรดเดอร์และนักพัฒนาได้มีเครื่องมือวิเคราะห์ตลาดระดับสถาบันที่ฟรีและโปร่งใส
                คุณสามารถเข้าไปโหวต สนับสนุน หรือร่วมส่ง Pull Request ได้ทาง TorYod และ GitHub!
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 shrink-0">
              <a
                href="https://www.toryod.co/projects/173ef2d4-7369-41e0-be4c-30719920b7ad-picklechart"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 active:scale-95 transition-transform"
              >
                <img
                  src="https://www.toryod.co/badge/173ef2d4-7369-41e0-be4c-30719920b7ad"
                  alt="Featured on TorYod"
                  height="54"
                  className="drop-shadow-md"
                />
              </a>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/ikarisz/PickleChart"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-emerald-400 rounded text-xs font-bold text-emerald-900 flex items-center gap-1.5 shadow-sm"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Star on GitHub</span>
                </a>
                <button
                  onClick={onLaunchTerminal}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Terminal</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* 10. Bottom Windows XP Status Bar */}
      <div className="h-6 bg-[#ece9d8] border-t border-[#aca899] px-2 flex items-center justify-between text-[11px] font-sans shrink-0 select-none text-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-900">PickleChart Online</span>
          </div>
          <span>•</span>
          <span>Binance Futures Data Feed Ready</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500">MIT Open Source License</span>
          <span className="text-slate-500">Local-First Storage</span>
          <button
            onClick={onLaunchTerminal}
            className="text-blue-700 font-bold hover:underline flex items-center gap-1"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
