import React from 'react';
import {
  Upload,
  Music,
  FileText,
  Sparkles,
  Languages,
  Mic,
  Subtitles,
  EyeOff,
  Film,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { StepStatus, PipelineStepId } from '../types/index.ts';

interface PipelineStepperProps {
  steps: StepStatus[];
  currentStepId: PipelineStepId;
  onRetryStep?: (stepId: PipelineStepId) => void;
}

const STEP_ICONS: Record<PipelineStepId, React.ReactNode> = {
  upload: <Upload className="w-4 h-4" />,
  'extract-audio': <Music className="w-4 h-4" />,
  transcript: <FileText className="w-4 h-4" />,
  recap: <Sparkles className="w-4 h-4" />,
  translate: <Languages className="w-4 h-4" />,
  voice: <Mic className="w-4 h-4" />,
  subtitles: <Subtitles className="w-4 h-4" />,
  blur: <EyeOff className="w-4 h-4" />,
  render: <Film className="w-4 h-4" />,
  complete: <CheckCircle className="w-4 h-4" />
};

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  steps,
  currentStepId,
  onRetryStep
}) => {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-lg mb-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <span>Processing Pipeline</span>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        </h3>
        <span className="text-xs text-zinc-500">
          Step {steps.findIndex((s) => s.id === currentStepId) + 1} of {steps.length}
        </span>
      </div>

      {/* Grid of steps */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStepId;
          const isDone = step.status === 'completed';
          const isProcessing = step.status === 'in_progress';
          const isError = step.status === 'error';

          let stateColor = 'border-zinc-800 bg-zinc-950/60 text-zinc-500';
          if (isDone) {
            stateColor = 'border-emerald-600/40 bg-emerald-950/20 text-emerald-400';
          } else if (isProcessing) {
            stateColor = 'border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/50';
          } else if (isError) {
            stateColor = 'border-red-600/60 bg-red-950/40 text-red-400';
          } else if (isCurrent) {
            stateColor = 'border-zinc-700 bg-zinc-800 text-zinc-300';
          }

          return (
            <div
              key={step.id}
              className={`flex flex-col p-2.5 rounded-xl border transition relative ${stateColor}`}
            >
              {/* Step top row */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-shrink-0">
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : isDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full border border-zinc-700 inline-block" />
                  )}
                </div>
              </div>

              {/* Icon & Label */}
              <div className="flex items-center space-x-1.5 mb-1">
                <div className="flex-shrink-0">{STEP_ICONS[step.id]}</div>
                <span className="text-[11px] font-semibold truncate leading-tight">
                  {step.label}
                </span>
              </div>

              {/* Progress bar or Retry button if error */}
              {isProcessing && typeof step.progress === 'number' && (
                <div className="w-full bg-zinc-800 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-amber-400 h-1 transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}

              {isError && onRetryStep && (
                <button
                  type="button"
                  onClick={() => onRetryStep(step.id)}
                  className="mt-1 flex items-center space-x-1 text-[10px] text-red-300 hover:text-red-200 bg-red-900/40 hover:bg-red-900/60 py-0.5 px-1.5 rounded transition w-full justify-center"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
