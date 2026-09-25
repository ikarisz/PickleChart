import { DrawingItem } from '../types/drawing';
import { ChartAppearanceSettings, ChartPreset } from '../types/settings';

const STORAGE_KEY_SETTINGS = 'ag_chart_settings_v1';
const STORAGE_KEY_PRESETS = 'ag_chart_presets_v1';
const STORAGE_KEY_DRAWINGS = 'ag_chart_drawings_v1';

export const DEFAULT_SETTINGS: ChartAppearanceSettings = {
  backgroundMode: 'solid',
  solidColor: '#11151c',
  gradientStart: '#0d1117',
  gradientEnd: '#1a2233',
  backgroundImage: null,
  backgroundImageOpacity: 0.35,
  backgroundImageBlur: 0,
  candleUpColor: '#22c55e',
  candleDownColor: '#ef4444',
  wickUpColor: '#22c55e',
  wickDownColor: '#ef4444',
  showBorders: true,
  showGrid: true,
  gridColor: '#1f293d',
  gridOpacity: 0.6,
  showWatermark: true,
  watermarkText: 'PickleChart',
  watermarkOpacity: 0.08,
  xpTheme: 'luna_blue',
  indicators: {
    ema9: { enabled: false, color: '#38bdf8' },
    ema21: { enabled: false, color: '#f59e0b' },
    ema50: { enabled: false, color: '#a855f7' },
    ema200: { enabled: false, color: '#ec4899' },
    vwap: { enabled: true, color: '#fbbf24' },
    bollinger: { enabled: false, color: '#06b6d4' },
    volumeProfile: { enabled: true, color: '#fbbf24' },
    cvd: { enabled: true, color: '#38bdf8' },
  },
};

export const BUILTIN_PRESETS: ChartPreset[] = [
  {
    id: 'xp-luna-classic',
    name: 'Windows XP Luna Classic',
    description: 'Authentic Windows XP Luna Blue chrome with crisp dark Bookmap chart.',
    isBuiltIn: true,
    createdAt: 1711000000000,
    settings: {
      ...DEFAULT_SETTINGS,
      xpTheme: 'luna_blue',
      solidColor: '#11151c',
      candleUpColor: '#22c55e',
      candleDownColor: '#ef4444',
    },
  },
  {
    id: 'xp-royale-noir',
    name: 'Windows XP Royale Noir',
    description: 'Sleek dark Windows XP Royale Noir edition for night trading.',
    isBuiltIn: true,
    createdAt: 1711000000001,
    settings: {
      ...DEFAULT_SETTINGS,
      xpTheme: 'royale_noir',
      solidColor: '#0a0d14',
      gridColor: '#151d2c',
      candleUpColor: '#10b981',
      candleDownColor: '#f43f5e',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Glow',
    description: 'High-contrast cyan & magenta neon palette with dark gradient background.',
    isBuiltIn: true,
    createdAt: 1711000000002,
    settings: {
      ...DEFAULT_SETTINGS,
      xpTheme: 'royale_noir',
      backgroundMode: 'gradient',
      gradientStart: '#080812',
      gradientEnd: '#131124',
      candleUpColor: '#00f0ff',
      candleDownColor: '#ff0055',
      wickUpColor: '#00f0ff',
      wickDownColor: '#ff0055',
      gridColor: '#2a1b4e',
      gridOpacity: 0.7,
      watermarkText: 'CYBERPUNK LIQUIDITY',
    },
  },
  {
    id: 'clean-pro-trader',
    name: 'Clean Pro Trader',
    description: 'Minimalist high-focus layout with subtle grid and clear EMA trendlines.',
    isBuiltIn: true,
    createdAt: 1711000000003,
    settings: {
      ...DEFAULT_SETTINGS,
      xpTheme: 'metallic',
      solidColor: '#0f131a',
      gridOpacity: 0.35,
      indicators: {
        ...DEFAULT_SETTINGS.indicators,
        ema21: { enabled: true, color: '#f59e0b' },
        ema50: { enabled: true, color: '#38bdf8' },
        vwap: { enabled: true, color: '#fbbf24' },
      },
    },
  },
];

export class SettingsStorage {
  public static loadSettings(): ChartAppearanceSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      if (
        !parsed.watermarkText ||
        parsed.watermarkText === 'ANTIGRAVITY PRO MAX' ||
        parsed.watermarkText === 'PICKLECHART'
      ) {
        parsed.watermarkText = 'PickleChart';
      }
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        indicators: {
          ...DEFAULT_SETTINGS.indicators,
          ...(parsed.indicators || {}),
        },
      };
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  public static saveSettings(settings: ChartAppearanceSettings) {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }

  public static loadPresets(): ChartPreset[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
      const custom: ChartPreset[] = raw ? JSON.parse(raw) : [];
      return [...BUILTIN_PRESETS, ...custom];
    } catch (e) {
      console.warn('Failed to load presets from localStorage:', e);
      return [...BUILTIN_PRESETS];
    }
  }

  public static saveCustomPreset(
    name: string,
    description: string,
    settings: ChartAppearanceSettings,
    drawings?: DrawingItem[]
  ): ChartPreset {
    const newPreset: ChartPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim() || 'My Custom Preset',
      description: description.trim() || 'Custom user created preset',
      isBuiltIn: false,
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(settings)),
      drawings: drawings ? JSON.parse(JSON.stringify(drawings)) : undefined,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
      const custom: ChartPreset[] = raw ? JSON.parse(raw) : [];
      custom.unshift(newPreset);
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(custom));
    } catch (e) {
      console.warn('Failed to save custom preset:', e);
    }

    return newPreset;
  }

  public static deleteCustomPreset(id: string): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (!raw) return false;
      const custom: ChartPreset[] = JSON.parse(raw);
      const filtered = custom.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.warn('Failed to delete custom preset:', e);
      return false;
    }
  }

  public static exportPresetToFile(preset: ChartPreset) {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      preset,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_preset.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static parsePresetJson(jsonStr: string): ChartPreset | null {
    try {
      const parsed = JSON.parse(jsonStr);
      const p = parsed.preset || parsed;
      if (!p.name || !p.settings) {
        throw new Error('Invalid preset structure: missing name or settings');
      }

      return {
        id: `imported-${Date.now()}`,
        name: `${p.name} (Imported)`,
        description: p.description || 'Imported from JSON file',
        isBuiltIn: false,
        createdAt: Date.now(),
        settings: {
          ...DEFAULT_SETTINGS,
          ...p.settings,
          indicators: {
            ...DEFAULT_SETTINGS.indicators,
            ...(p.settings.indicators || {}),
          },
        },
        drawings: p.drawings || undefined,
      };
    } catch (err) {
      console.error('Failed to parse preset JSON:', err);
      return null;
    }
  }

  public static loadDrawings(): DrawingItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAWINGS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to load drawings:', e);
      return [];
    }
  }

  public static saveDrawings(drawings: DrawingItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY_DRAWINGS, JSON.stringify(drawings));
    } catch (e) {
      console.warn('Failed to save drawings:', e);
    }
  }
}
