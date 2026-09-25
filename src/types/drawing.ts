export type DrawingToolType =
  | 'select'
  | 'trendline'
  | 'horizontal_ray'
  | 'box'
  | 'fibonacci'
  | 'text'
  | 'fixed_range_vp'
  | 'measure';

export interface DrawingItem {
  id: string;
  type: 'trendline' | 'horizontal_ray' | 'box' | 'fibonacci' | 'text' | 'fixed_range_vp';
  price1: number;
  time1: number; // in Unix seconds
  price2?: number;
  time2?: number; // in Unix seconds
  color: string;
  fillColor?: string;
  fillOpacity?: number;
  lineWidth?: number;
  lineDash?: number[];
  label?: string;
  text?: string;
  isSelected?: boolean;
  createdAt: number;
}
