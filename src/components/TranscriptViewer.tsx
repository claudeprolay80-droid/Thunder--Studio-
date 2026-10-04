import React, { useState } from 'react';
import { FileText, Clock, Edit2, Check, Plus, Trash2, Play } from 'lucide-react';
import { TranscriptSegment } from '../types/index.ts';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  onUpdateSegments: (newSegments: TranscriptSegment[]) => void;
  onSeekTo: (seconds: number) => void;
  currentTime: number;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  onUpdateSegments,
  onSeekTo,
  currentTime
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);

  const startEdit = (seg: TranscriptSegment) => {
    setEditingId(seg.id);
    setEditText(seg.text);
    setEditStart(seg.start);
    setEditEnd(seg.end);
  };

  const saveEdit = (id: string) => {
    const updated = segments.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          text: editText.trim() || s.text,
          start: Math.max(0, editStart),
          end: Math.max(editStart + 0.5, editEnd)
        };
      }
      return s;
    });
    onUpdateSegments(updated);
    setEditingId(null);
  };

  const deleteSegment = (id: string) => {
    onUpdateSegments(segments.filter((s) => s.id !== id));
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Original Video Transcript</h4>
            <p className="text-xs text-zinc-400">
              {segments.length} chronological audio segments transcribed via Gemini AI
            </p>
          </div>
        </div>
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[380px]">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            No transcript generated yet. Start the workflow to extract audio and transcribe.
          </div>
        ) : (
          segments.map((seg) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isEditing = editingId === seg.id;

            return (
              <div
                key={seg.id}
                className={`p-3 rounded-xl border transition ${
                  isActive
                    ? 'bg-sky-950/20 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-400 font-mono block">Start (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editStart}
                          onChange={(e) => setEditStart(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-400 font-mono block">End (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editEnd}
                          onChange={(e) => setEditEnd(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200"
                        />
                      </div>
                    </div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(seg.id)}
                        className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold rounded text-xs flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        type="button"
                        onClick={() => onSeekTo(seg.start)}
                        className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold text-sky-400 hover:text-sky-300 transition"
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatSeconds(seg.start)} - {formatSeconds(seg.end)}
                        </span>
                        <Play className="w-2.5 h-2.5 fill-current ml-1 opacity-70" />
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => startEdit(seg)}
                          className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
                          title="Edit Segment"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSegment(seg.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition"
                          title="Delete Segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">{seg.text}</p>
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
