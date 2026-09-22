import React from 'react';
import { DrawingToolType } from '../../types/drawing';
import {
  MousePointer,
  TrendingUp,
  Minus,
  Square,
  Percent,
  Type,
  Ruler,
  Undo2,
  Trash2,
  Palette,
} from 'lucide-react';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  currentColor: string;
  onChangeColor: (color: string) => void;
  onUndo: () => void;
  onClearAll: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  drawingsCount: number;
}

const COLOR_PRESETS = [
  { name: 'Gold', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#ef4444' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'White', value: '#ffffff' },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentColor,
  onChangeColor,
  onUndo,
  onClearAll,
  onDeleteSelected,
  hasSelection,
  canUndo,
  drawingsCount,
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const tools: Array<{
    type: DrawingToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }> = [
    { type: 'select', label: 'Select & Move', shortcut: 'V', icon: <MousePointer className="w-3.5 h-3.5" /> },
    { type: 'trendline', label: 'Trendline', shortcut: 'T', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { type: 'horizontal_ray', label: 'Horizontal Level', shortcut: 'H', icon: <Minus className="w-3.5 h-3.5" /> },
    { type: 'box', label: 'Order Block / Box', shortcut: 'B', icon: <Square className="w-3.5 h-3.5" /> },
    { type: 'fibonacci', label: 'Fibonacci Retracement', shortcut: 'F', icon: <Percent className="w-3.5 h-3.5" /> },
    { type: 'text', label: 'Text Note', shortcut: 'N', icon: <Type className="w-3.5 h-3.5" /> },
    { type: 'measure', label: 'Range Ruler', shortcut: 'M', icon: <Ruler className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside
      aria-label="Drawing Tools"
      className="absolute left-3 top-16 z-20 flex flex-col bg-[#ece9d8] border-2 border-[#0055ea] rounded-md shadow-2xl overflow-visible text-slate-900 select-none font-sans text-xs"
    >
      {/* XP Window Header Bar */}
      <div className="bg-gradient-to-r from-[#0055ea] via-[#2470f5] to-[#0055ea] text-white px-2 py-0.5 text-[10px] font-bold flex items-center justify-between cursor-move shadow-sm">
        <span className="tracking-wide">Tools</span>
        <span className="text-[9px] opacity-80">{drawingsCount > 0 ? `(${drawingsCount})` : ''}</span>
      </div>

      {/* Tool Buttons */}
      <div className="p-1 flex flex-col gap-1">
        {tools.map((t) => {
          const isActive = activeTool === t.type;
          return (
            <button
              key={t.type}
              onClick={() => onSelectTool(t.type)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-[#fbbf24] text-slate-950 font-bold border border-[#d97706] shadow-inner'
                  : 'hover:bg-[#dfdbcc] border border-transparent active:border-[#808080]'
              }`}
              title={`${t.label} (Press ${t.shortcut})`}
            >
              <span className={isActive ? 'text-amber-900' : 'text-slate-700'}>{t.icon}</span>
              <span className="hidden xl:inline">{t.label}</span>
              <span className="text-[9px] text-slate-500 font-mono ml-auto opacity-70">[{t.shortcut}]</span>
            </button>
          );
        })}

        {/* Separator Bevel */}
        <div className="my-0.5 border-t border-[#aca899] border-b border-white" />

        {/* Color Picker Button */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] hover:bg-[#dfdbcc] border border-transparent active:border-[#808080]"
            title="Drawing Color"
          >
            <span
              className="w-3.5 h-3.5 rounded border border-slate-700 shadow-sm shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <span className="hidden xl:inline font-medium">Color</span>
            <Palette className="w-3 h-3 text-slate-600 ml-auto" />
          </button>

          {/* Color Palette Popover */}
          {showColorPicker && (
            <div className="absolute left-full top-0 ml-1 bg-[#ece9d8] border-2 border-[#0055ea] rounded-md p-1.5 shadow-xl grid grid-cols-3 gap-1 z-30 w-28">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    onChangeColor(c.value);
                    setShowColorPicker(false);
                  }}
                  className="w-7 h-7 rounded border border-slate-700 hover:scale-110 transition-transform shadow"
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Separator Bevel */}
        <div className="my-0.5 border-t border-[#aca899] border-b border-white" />

        {/* Undo & Delete Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex-1 flex items-center justify-center p-1 rounded border border-transparent ${
              canUndo
                ? 'hover:bg-[#dfdbcc] active:border-[#808080] text-slate-800'
                : 'opacity-40 text-slate-400 cursor-not-allowed'
            }`}
            title="Undo Last Drawing (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {hasSelection && (
            <button
              onClick={onDeleteSelected}
              className="flex-1 flex items-center justify-center p-1 rounded hover:bg-rose-100 text-rose-600 border border-transparent active:border-rose-400"
              title="Delete Selected Drawing (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {drawingsCount > 0 && !hasSelection && (
            <button
              onClick={onClearAll}
              className="flex-1 flex items-center justify-center p-1 rounded hover:bg-[#dfdbcc] text-slate-600 border border-transparent active:border-[#808080]"
              title="Clear All Drawings"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
