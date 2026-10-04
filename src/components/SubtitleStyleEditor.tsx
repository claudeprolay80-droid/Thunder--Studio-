import React, { useState } from 'react';
import {
  Subtitles,
  Palette,
  Type,
  Clock,
  Edit2,
  Check,
  RotateCcw,
  Play,
  Trash2,
  Plus
} from 'lucide-react';
import { SubtitleChunk, SubtitleStyleConfig } from '../types/index.ts';

interface SubtitleStyleEditorProps {
  subtitles: SubtitleChunk[];
  style: SubtitleStyleConfig;
  onChangeStyle: (style: SubtitleStyleConfig) => void;
  onUpdateSubtitles: (subtitles: SubtitleChunk[]) => void;
  onRecalculateChunks: () => void;
  onSeekTo: (seconds: number) => void;
  currentTime: number;
}

export const SubtitleStyleEditor: React.FC<SubtitleStyleEditorProps> = ({
  subtitles,
  style,
  onChangeStyle,
  onUpdateSubtitles,
  onRecalculateChunks,
  onSeekTo,
  currentTime
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);

  const updateStyleProp = <K extends keyof SubtitleStyleConfig>(
    field: K,
    val: SubtitleStyleConfig[K]
  ) => {
    onChangeStyle({
      ...style,
      [field]: val
    });
  };

  const startEdit = (chunk: SubtitleChunk) => {
    setEditingId(chunk.id);
    setEditText(chunk.text);
    setEditStart(chunk.start);
    setEditEnd(chunk.end);
  };

  const saveEdit = (id: string) => {
    const updated = subtitles.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          text: editText.trim() || c.text,
          start: Math.max(0, editStart),
          end: Math.max(editStart + 0.3, editEnd)
        };
      }
      return c;
    });
    onUpdateSubtitles(updated);
    setEditingId(null);
  };

  const deleteChunk = (id: string) => {
    onUpdateSubtitles(subtitles.filter((c) => c.id !== id));
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Subtitles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Burmese Recap Subtitles</h4>
            <p className="text-xs text-zinc-400">
              Short readable 2–6 word chunks synchronized with narration
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRecalculateChunks}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold transition"
          title="Recalculate chunk splits based on current recap script"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rechunk</span>
        </button>
      </div>

      {/* Subtitle Style Bar */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 mb-4 space-y-3">
        <div className="flex items-center space-x-1 text-xs font-bold text-zinc-300">
          <Palette className="w-3.5 h-3.5 text-emerald-400" />
          <span>Subtitle Style & Positioning</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Font Size */}
          <div>
            <span className="text-zinc-400 text-[10px] block mb-1">
              Font Size: <span className="text-emerald-400 font-mono">{style.fontSize}px</span>
            </span>
            <input
              type="range"
              min={18}
              max={44}
              value={style.fontSize}
              onChange={(e) => updateStyleProp('fontSize', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Text Color */}
          <div>
            <span className="text-zinc-400 text-[10px] block mb-1">Text Color</span>
            <div className="flex items-center space-x-1.5">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => updateStyleProp('textColor', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="font-mono text-[11px] text-zinc-300 uppercase">{style.textColor}</span>
            </div>
          </div>

          {/* Background Opacity */}
          <div>
            <span className="text-zinc-400 text-[10px] block mb-1">
              Bg Opacity: <span className="text-emerald-400 font-mono">{Math.round(style.bgOpacity * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={style.bgOpacity}
              onChange={(e) => updateStyleProp('bgOpacity', parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Bottom Margin */}
          <div>
            <span className="text-zinc-400 text-[10px] block mb-1">
              Bottom Margin: <span className="text-emerald-400 font-mono">{style.bottomMarginPercent}%</span>
            </span>
            <input
              type="range"
              min={2}
              max={25}
              value={style.bottomMarginPercent}
              onChange={(e) => updateStyleProp('bottomMarginPercent', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Subtitle Chunks Timeline */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
        {subtitles.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No subtitles chunked yet.
          </div>
        ) : (
          subtitles.map((chunk, index) => {
            const isActive = currentTime >= chunk.start && currentTime <= chunk.end;
            const isEditing = editingId === chunk.id;

            return (
              <div
                key={chunk.id}
                className={`p-2.5 rounded-xl border transition ${
                  isActive
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow ring-1 ring-emerald-500/30'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.1"
                        value={editStart}
                        onChange={(e) => setEditStart(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-200"
                      />
                      <span className="text-zinc-500 text-xs">→</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editEnd}
                        onChange={(e) => setEditEnd(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-200"
                      />
                    </div>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-semibold"
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(chunk.id)}
                        className="px-2.5 py-0.5 bg-emerald-500 text-zinc-950 font-bold rounded text-[11px] flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={() => onSeekTo(chunk.start)}
                        className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatSeconds(chunk.start)} - {formatSeconds(chunk.end)}
                        </span>
                      </button>
                      <span className="text-xs font-semibold text-zinc-200 truncate font-['Noto_Sans_Myanmar','Padauk']">
                        "{chunk.text}"
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(chunk)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteChunk(chunk.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
