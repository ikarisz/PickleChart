import { DrawingItem } from './drawing';

export type BackgroundMode = 'solid' | 'gradient' | 'image';
export type XPThemeStyle = 'luna_blue' | 'royale_noir' | 'metallic';

export interface IndicatorConfig {
  enabled: boolean;
  color: string;
  lineWidth?: number;
}

export interface IndicatorSettings {
  ema9: IndicatorConfig;
  ema21: IndicatorConfig;
  ema50: IndicatorConfig;
  ema200: IndicatorConfig;
  vwap: IndicatorConfig;
  bollinger: IndicatorConfig;
  volumeProfile: IndicatorConfig; // visible-range volume profile (POC / VAH / VAL)
  cvd: IndicatorConfig; // cumulative volume delta sub-pane
}

export interface ChartAppearanceSettings {
  backgroundMode: BackgroundMode;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  backgroundImage: string | null; // Base64 data URL or external URL
  backgroundImageOpacity: number; // 0.05 to 1.0
  backgroundImageBlur: number; // 0 to 20 px
  candleUpColor: string;
  candleDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
  showBorders: boolean;
  showGrid: boolean;
  gridColor: string;
  gridOpacity: number;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  xpTheme: XPThemeStyle;
  indicators: IndicatorSettings;
}

export interface ChartPreset {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  createdAt: number;
  settings: ChartAppearanceSettings;
  drawings?: DrawingItem[];
}
