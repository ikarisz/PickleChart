import React, { useState, useRef } from 'react';
import { ChartAppearanceSettings, ChartPreset } from '../../types/settings';
import { SettingsStorage } from '../../services/settingsStorage';
import {
  Upload,
  Download,
  Trash2,
  X,
  Plus,
} from 'lucide-react';

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartAppearanceSettings;
  onSaveSettings: (settings: ChartAppearanceSettings) => void;
  presets: ChartPreset[];
  onApplyPreset: (preset: ChartPreset) => void;
  onRefreshPresets: () => void;
}

type TabType = 'bg' | 'candles' | 'indicators' | 'presets';

export const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  presets,
  onApplyPreset,
  onRefreshPresets,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('bg');
  const [localSettings, setLocalSettings] = useState<ChartAppearanceSettings>({ ...settings });
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Sync when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings({ ...settings });
      setImportError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Handle local image upload -> Base64 data URL
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB recommended for local-first storage)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLocalSettings((prev) => ({
        ...prev,
        backgroundMode: 'image',
        backgroundImage: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle preset save
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    SettingsStorage.saveCustomPreset(newPresetName, newPresetDesc, localSettings);
    setNewPresetName('');
    setNewPresetDesc('');
    onRefreshPresets();
  };

  // Handle preset delete
  const handleDeletePreset = (id: string) => {
    SettingsStorage.deleteCustomPreset(id);
    onRefreshPresets();
  };

  // Handle JSON preset import
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const preset = SettingsStorage.parsePresetJson(text);
        if (preset) {
          SettingsStorage.saveCustomPreset(
            preset.name,
            preset.description,
            preset.settings,
            preset.drawings
          );
          setLocalSettings({ ...preset.settings });
          onRefreshPresets();
          setImportError(null);
        } else {
          setImportError('Invalid preset JSON format.');
        }
      } catch (err) {
        setImportError(String(err));
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    onSaveSettings(localSettings);
  };

  const handleOK = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      {/* Windows XP Dialog Box */}
      <div
        className="w-full max-w-2xl bg-[#ece9d8] border-2 border-[#0055ea] rounded-t-lg rounded-b shadow-2xl overflow-hidden font-sans text-xs text-slate-900 flex flex-col max-h-[90vh]"
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 1px 1px 0 #fff, inset -1px -1px 0 #707070',
        }}
      >
        {/* Windows XP Luna Title Bar */}
        <div className="h-8 bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] text-white px-3 flex items-center justify-between shadow-sm cursor-default">
          <div className="flex items-center gap-2 font-bold tracking-wide">
            <span className="text-base select-none">🥒</span>
            <span>PickleChart Properties & Customization</span>
          </div>

          {/* XP Close Button */}
          <button
            onClick={onClose}
            className="w-5 h-5 rounded bg-[#e81123] hover:bg-[#f13847] active:bg-[#b00f1c] flex items-center justify-center text-white font-bold border border-white/40 shadow-sm"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Windows XP Property Sheet Tabs */}
        <div className="px-3 pt-2 bg-[#ece9d8] border-b border-[#aca899] flex gap-1">
          <button
            onClick={() => setActiveTab('bg')}
            className={`px-3 py-1.5 rounded-t font-semibold transition-all border-t border-l border-r ${
              activeTab === 'bg'
                ? 'bg-white text-blue-900 border-[#aca899] -mb-px pb-2 shadow-sm font-bold'
                : 'bg-[#d8d4c4] text-slate-700 border-transparent hover:bg-[#e4e0d0]'
            }`}
          >
            Appearance & Background
          </button>
          <button
            onClick={() => setActiveTab('candles')}
            className={`px-3 py-1.5 rounded-t font-semibold transition-all border-t border-l border-r ${
              activeTab === 'candles'
                ? 'bg-white text-blue-900 border-[#aca899] -mb-px pb-2 shadow-sm font-bold'
                : 'bg-[#d8d4c4] text-slate-700 border-transparent hover:bg-[#e4e0d0]'
            }`}
          >
            Candles & Grid
          </button>
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-3 py-1.5 rounded-t font-semibold transition-all border-t border-l border-r ${
              activeTab === 'indicators'
                ? 'bg-white text-blue-900 border-[#aca899] -mb-px pb-2 shadow-sm font-bold'
                : 'bg-[#d8d4c4] text-slate-700 border-transparent hover:bg-[#e4e0d0]'
            }`}
          >
            Indicators
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-t font-semibold transition-all border-t border-l border-r ${
              activeTab === 'presets'
                ? 'bg-white text-blue-900 border-[#aca899] -mb-px pb-2 shadow-sm font-bold'
                : 'bg-[#d8d4c4] text-slate-700 border-transparent hover:bg-[#e4e0d0]'
            }`}
          >
            Presets & Import/Export
          </button>
        </div>

        {/* Tab Body Content Area (White Box like XP) */}
        <div className="flex-1 p-4 bg-white border border-[#aca899] mx-3 my-2 rounded overflow-y-auto shadow-inner text-slate-800">
          {/* TAB 1: BACKGROUND & APPEARANCE */}
          {activeTab === 'bg' && (
            <div className="space-y-4">
              <fieldset className="border border-[#d0d0d0] p-3 rounded">
                <legend className="px-1 text-blue-800 font-bold">Background Type</legend>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="bgMode"
                      checked={localSettings.backgroundMode === 'solid'}
                      onChange={() => setLocalSettings((p) => ({ ...p, backgroundMode: 'solid' }))}
                    />
                    <span>Solid Color</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="bgMode"
                      checked={localSettings.backgroundMode === 'gradient'}
                      onChange={() => setLocalSettings((p) => ({ ...p, backgroundMode: 'gradient' }))}
                    />
                    <span>Gradient</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="bgMode"
                      checked={localSettings.backgroundMode === 'image'}
                      onChange={() => setLocalSettings((p) => ({ ...p, backgroundMode: 'image' }))}
                    />
                    <span>Custom Image</span>
                  </label>
                </div>
              </fieldset>

              {/* Solid Color Picker */}
              {localSettings.backgroundMode === 'solid' && (
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border">
                  <span>Color:</span>
                  <input
                    type="color"
                    value={localSettings.solidColor}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, solidColor: e.target.value }))}
                    className="w-10 h-7 rounded cursor-pointer border"
                  />
                  <span className="font-mono text-xs">{localSettings.solidColor}</span>
                </div>
              )}

              {/* Gradient Pickers */}
              {localSettings.backgroundMode === 'gradient' && (
                <div className="flex items-center gap-4 p-2 bg-slate-50 rounded border">
                  <div className="flex items-center gap-2">
                    <span>Start:</span>
                    <input
                      type="color"
                      value={localSettings.gradientStart}
                      onChange={(e) => setLocalSettings((p) => ({ ...p, gradientStart: e.target.value }))}
                      className="w-9 h-7 rounded cursor-pointer border"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>End:</span>
                    <input
                      type="color"
                      value={localSettings.gradientEnd}
                      onChange={(e) => setLocalSettings((p) => ({ ...p, gradientEnd: e.target.value }))}
                      className="w-9 h-7 rounded cursor-pointer border"
                    />
                  </div>
                </div>
              )}

              {/* Local Image Upload Section */}
              {localSettings.backgroundMode === 'image' && (
                <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-3">
                  <legend className="px-1 text-blue-800 font-bold">Local Background Image</legend>

                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#ece9d8] hover:bg-[#dfdbcc] active:border-[#808080] border border-[#707070] rounded font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-700" />
                      <span>Upload Image from PC...</span>
                    </button>

                    {localSettings.backgroundImage && (
                      <button
                        type="button"
                        onClick={() => setLocalSettings((p) => ({ ...p, backgroundImage: null }))}
                        className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-300 rounded font-semibold"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Preview */}
                  {localSettings.backgroundImage ? (
                    <div className="relative w-full h-32 rounded border overflow-hidden bg-slate-950 flex items-center justify-center">
                      <img
                        src={localSettings.backgroundImage}
                        alt="Background Preview"
                        className="w-full h-full object-cover"
                        style={{
                          opacity: localSettings.backgroundImageOpacity,
                          filter: `blur(${localSettings.backgroundImageBlur}px)`,
                        }}
                      />
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                        Active Underlay
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed rounded text-center text-slate-500 text-xs">
                      No image uploaded yet. Click upload to choose any picture (.png, .jpg, .webp) from your device.
                    </div>
                  )}

                  {/* Sliders for Opacity and Blur */}
                  {localSettings.backgroundImage && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span>Image Opacity: {Math.round(localSettings.backgroundImageOpacity * 100)}%</span>
                        <input
                          type="range"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={localSettings.backgroundImageOpacity}
                          onChange={(e) =>
                            setLocalSettings((p) => ({ ...p, backgroundImageOpacity: parseFloat(e.target.value) }))
                          }
                          className="w-48 accent-blue-600"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Image Blur: {localSettings.backgroundImageBlur}px</span>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={localSettings.backgroundImageBlur}
                          onChange={(e) =>
                            setLocalSettings((p) => ({ ...p, backgroundImageBlur: parseInt(e.target.value) }))
                          }
                          className="w-48 accent-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              {/* Watermark Section */}
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-2">
                <legend className="px-1 text-blue-800 font-bold">Chart Watermark</legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.showWatermark}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, showWatermark: e.target.checked }))}
                  />
                  <span>Show Custom Watermark Text</span>
                </label>
                {localSettings.showWatermark && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={localSettings.watermarkText}
                      onChange={(e) => setLocalSettings((p) => ({ ...p, watermarkText: e.target.value }))}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      placeholder="e.g. TRADING DESK"
                    />
                    <span className="text-[11px] text-slate-500">Opacity:</span>
                    <input
                      type="range"
                      min="0.02"
                      max="0.4"
                      step="0.02"
                      value={localSettings.watermarkOpacity}
                      onChange={(e) =>
                        setLocalSettings((p) => ({ ...p, watermarkOpacity: parseFloat(e.target.value) }))
                      }
                      className="w-24 accent-blue-600"
                    />
                  </div>
                )}
              </fieldset>

              {/* Windows XP Theme Selection */}
              <fieldset className="border border-[#d0d0d0] p-3 rounded">
                <legend className="px-1 text-blue-800 font-bold">Windows XP Color Scheme</legend>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="xpTheme"
                      checked={localSettings.xpTheme === 'luna_blue'}
                      onChange={() => setLocalSettings((p) => ({ ...p, xpTheme: 'luna_blue' }))}
                    />
                    <span className="font-semibold text-blue-800">Luna Classic (Blue)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="xpTheme"
                      checked={localSettings.xpTheme === 'royale_noir'}
                      onChange={() => setLocalSettings((p) => ({ ...p, xpTheme: 'royale_noir' }))}
                    />
                    <span className="font-semibold text-slate-900">Royale Noir (Dark)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="xpTheme"
                      checked={localSettings.xpTheme === 'metallic'}
                      onChange={() => setLocalSettings((p) => ({ ...p, xpTheme: 'metallic' }))}
                    />
                    <span className="font-semibold text-slate-700">Silver / Metallic</span>
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 2: CANDLES & GRID */}
          {activeTab === 'candles' && (
            <div className="space-y-4">
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-3">
                <legend className="px-1 text-blue-800 font-bold">Candlestick Colors</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-2 bg-slate-50 rounded border">
                    <span className="font-bold text-emerald-700">Bullish (Up Candle):</span>
                    <div className="flex items-center justify-between">
                      <span>Body Color:</span>
                      <input
                        type="color"
                        value={localSettings.candleUpColor}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, candleUpColor: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Wick Color:</span>
                      <input
                        type="color"
                        value={localSettings.wickUpColor}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, wickUpColor: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-2 bg-slate-50 rounded border">
                    <span className="font-bold text-rose-700">Bearish (Down Candle):</span>
                    <div className="flex items-center justify-between">
                      <span>Body Color:</span>
                      <input
                        type="color"
                        value={localSettings.candleDownColor}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, candleDownColor: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Wick Color:</span>
                      <input
                        type="color"
                        value={localSettings.wickDownColor}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, wickDownColor: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-3">
                <legend className="px-1 text-blue-800 font-bold">Grid Lines</legend>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.showGrid}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, showGrid: e.target.checked }))}
                  />
                  <span>Enable Grid Lines (Time & Price Axis)</span>
                </label>

                {localSettings.showGrid && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span>Grid Color:</span>
                      <input
                        type="color"
                        value={localSettings.gridColor}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, gridColor: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Grid Opacity:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={localSettings.gridOpacity}
                        onChange={(e) => setLocalSettings((p) => ({ ...p, gridOpacity: parseFloat(e.target.value) }))}
                        className="w-32 accent-blue-600"
                      />
                    </div>
                  </div>
                )}
              </fieldset>
            </div>
          )}

          {/* TAB 3: INDICATORS */}
          {activeTab === 'indicators' && (
            <div className="space-y-3">
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-2">
                <legend className="px-1 text-blue-800 font-bold">Moving Averages & Overlays</legend>

                {/* EMA 9 */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.ema9.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            ema9: { ...p.indicators.ema9, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>EMA 9 (Fast Momentum)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.ema9.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          ema9: { ...p.indicators.ema9, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>

                {/* EMA 21 */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.ema21.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            ema21: { ...p.indicators.ema21, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>EMA 21 (Short Trend)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.ema21.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          ema21: { ...p.indicators.ema21, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>

                {/* EMA 50 */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.ema50.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            ema50: { ...p.indicators.ema50, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>EMA 50 (Medium Trend)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.ema50.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          ema50: { ...p.indicators.ema50, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>

                {/* EMA 200 */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.ema200.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            ema200: { ...p.indicators.ema200, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>EMA 200 (Macro Baseline)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.ema200.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          ema200: { ...p.indicators.ema200, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>

                {/* VWAP */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.vwap.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            vwap: { ...p.indicators.vwap, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>Session VWAP (Volume Weighted Avg Price)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.vwap.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          vwap: { ...p.indicators.vwap, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>

                {/* Bollinger Bands */}
                <div className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={localSettings.indicators.bollinger.enabled}
                      onChange={(e) =>
                        setLocalSettings((p) => ({
                          ...p,
                          indicators: {
                            ...p.indicators,
                            bollinger: { ...p.indicators.bollinger, enabled: e.target.checked },
                          },
                        }))
                      }
                    />
                    <span>Bollinger Bands (20 SMA, 2 StdDev)</span>
                  </label>
                  <input
                    type="color"
                    value={localSettings.indicators.bollinger.color}
                    onChange={(e) =>
                      setLocalSettings((p) => ({
                        ...p,
                        indicators: {
                          ...p.indicators,
                          bollinger: { ...p.indicators.bollinger, color: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-6 rounded cursor-pointer border"
                  />
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 4: PRESETS & IMPORT / EXPORT */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Presets List */}
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-2">
                <legend className="px-1 text-blue-800 font-bold">Preset Profiles</legend>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {presets.map((pr) => (
                    <div
                      key={pr.id}
                      className="p-2 border rounded flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{pr.name}</span>
                          {pr.isBuiltIn && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                              Built-in
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{pr.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalSettings({ ...pr.settings });
                            onApplyPreset(pr);
                          }}
                          className="px-2 py-1 bg-[#ece9d8] hover:bg-[#dfdbcc] border rounded font-semibold text-blue-800 text-[11px]"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => SettingsStorage.exportPresetToFile(pr)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Export Preset to .json"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {!pr.isBuiltIn && (
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(pr.id)}
                            className="p-1 hover:bg-rose-100 text-rose-600 rounded"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* Save Current as New Preset */}
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-2">
                <legend className="px-1 text-blue-800 font-bold">Save Current Settings as Preset</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Preset Name (e.g. My Gold Setup)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    className="px-2 py-1 border rounded text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveCustomPreset}
                  disabled={!newPresetName.trim()}
                  className="px-3 py-1 bg-[#ece9d8] hover:bg-[#dfdbcc] border rounded font-semibold flex items-center gap-1 text-blue-900 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Preset Locally</span>
                </button>
              </fieldset>

              {/* Import / Export JSON */}
              <fieldset className="border border-[#d0d0d0] p-3 rounded space-y-2">
                <legend className="px-1 text-blue-800 font-bold">Open Source Preset Sharing (.JSON)</legend>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={jsonImportRef}
                    accept=".json"
                    onChange={handleJsonImport}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonImportRef.current?.click()}
                    className="px-3 py-1.5 bg-[#ece9d8] hover:bg-[#dfdbcc] border rounded font-semibold flex items-center gap-1.5 text-slate-800"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Import Preset from File...</span>
                  </button>
                </div>
                {importError && <div className="text-rose-600 text-[10px]">{importError}</div>}
              </fieldset>
            </div>
          )}
        </div>

        {/* Windows XP Dialog Action Buttons (OK, Cancel, Apply) */}
        <div className="px-3 py-2 bg-[#ece9d8] border-t border-[#aca899] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleOK}
            className="w-20 py-1 bg-[#ece9d8] hover:bg-[#dfdbcc] active:border-[#808080] border border-[#707070] rounded font-bold text-slate-900 shadow-sm"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-20 py-1 bg-[#ece9d8] hover:bg-[#dfdbcc] active:border-[#808080] border border-[#707070] rounded text-slate-800 shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-20 py-1 bg-[#ece9d8] hover:bg-[#dfdbcc] active:border-[#808080] border border-[#707070] rounded text-slate-800 shadow-sm font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
