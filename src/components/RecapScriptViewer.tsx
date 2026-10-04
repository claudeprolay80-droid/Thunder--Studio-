import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Volume2,
  Play,
  RotateCw,
  Edit2,
  Check,
  Languages,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { RecapSegment, VoiceSettingsConfig } from '../types/index.ts';

interface RecapScriptViewerProps {
  segments: RecapSegment[];
  onUpdateSegments: (segments: RecapSegment[]) => void;
  onRegenerateVoiceForSegment: (segment: RecapSegment) => void;
  onSeekTo: (seconds: number) => void;
  currentTime: number;
}

export const RecapScriptViewer: React.FC<RecapScriptViewerProps> = ({
  segments,
  onUpdateSegments,
  onRegenerateVoiceForSegment,
  onSeekTo,
  currentTime
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBurmese, setEditBurmese] = useState('');
  const [editEnglish, setEditEnglish] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const startEdit = (seg: RecapSegment) => {
    setEditingId(seg.id);
    setEditBurmese(seg.burmese_recap);
    setEditEnglish(seg.english_recap);
    setEditStart(seg.start);
    setEditEnd(seg.end);
  };

  const saveEdit = (id: string) => {
    const updated = segments.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          burmese_recap: editBurmese.trim() || s.burmese_recap,
          english_recap: editEnglish.trim() || s.english_recap,
          start: Math.max(0, editStart),
          end: Math.max(editStart + 0.5, editEnd)
        };
      }
      return s;
    });
    onUpdateSegments(updated);
    setEditingId(null);
  };

  const playSegmentAudio = (seg: RecapSegment) => {
    if (!seg.audioUrl) return;
    const audio = new Audio(seg.audioUrl);
    setPlayingAudioId(seg.id);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingAudioId(null);
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
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Burmese Movie Recap Narration</h4>
            <p className="text-xs text-zinc-400">
              Chronological storytelling script with English-to-Myanmar pronunciation mapping
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
          {segments.length} Recap Scenes
        </span>
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
        {segments.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            No recap script generated yet. Start the workflow to generate the Burmese recap.
          </div>
        ) : (
          segments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isEditing = editingId === seg.id;
            const hasAudio = !!seg.audioUrl;

            return (
              <div
                key={seg.id}
                className={`p-3.5 rounded-xl border transition ${
                  isActive
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-lg ring-1 ring-amber-500/40'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2.5">
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

                    <div>
                      <label className="text-[10px] text-amber-400 font-bold block mb-1">
                        Burmese Narration Text (spoken style)
                      </label>
                      <textarea
                        value={editBurmese}
                        onChange={(e) => setEditBurmese(e.target.value)}
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        English Recap Reference
                      </label>
                      <input
                        type="text"
                        value={editEnglish}
                        onChange={(e) => setEditEnglish(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
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
                        className="px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save & Update</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSeekTo(seg.start)}
                          className="flex items-center space-x-1 text-[11px] font-mono font-semibold text-amber-400 hover:text-amber-300 transition"
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatSeconds(seg.start)} - {formatSeconds(seg.end)}
                          </span>
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5 opacity-80" />
                        </button>
                      </div>

                      {/* Voice Status & Segment Actions */}
                      <div className="flex items-center space-x-1.5">
                        {hasAudio ? (
                          <button
                            type="button"
                            onClick={() => playSegmentAudio(seg)}
                            disabled={playingAudioId === seg.id}
                            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${
                              playingAudioId === seg.id
                                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{playingAudioId === seg.id ? 'Playing' : `${seg.audioDuration?.toFixed(1)}s`}</span>
                          </button>
                        ) : seg.isGeneratingAudio ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>TTS...</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">No voice</span>
                        )}

                        <button
                          type="button"
                          onClick={() => onRegenerateVoiceForSegment(seg)}
                          className="p-1 text-zinc-400 hover:text-amber-300 rounded hover:bg-zinc-800 transition"
                          title="Generate / Retry Edge TTS Voice for this segment"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => startEdit(seg)}
                          className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
                          title="Edit Text or Timing"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Burmese Spoken Narration */}
                    <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/60 mb-1.5">
                      <p className="text-xs sm:text-sm text-amber-200 leading-relaxed font-semibold">
                        {seg.burmese_recap}
                      </p>
                    </div>

                    {/* English Recap summary */}
                    <p className="text-[11px] text-zinc-400 italic">
                      {seg.english_recap}
                    </p>
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
