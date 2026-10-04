import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, X, RotateCcw } from 'lucide-react';

interface StatusBannerProps {
  statusText?: string;
  errorText?: string;
  onClearError?: () => void;
  onRetry?: () => void;
  isProcessing?: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  statusText,
  errorText,
  onClearError,
  onRetry,
  isProcessing
}) => {
  if (!errorText && !statusText) return null;

  return (
    <div className="mb-6 animate-fade-in">
      {errorText ? (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-200 flex items-start justify-between shadow-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-red-300 mb-0.5">
                Processing Error
              </h5>
              <p className="text-xs text-red-200 leading-relaxed">{errorText}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-red-900/60 hover:bg-red-900 text-xs font-semibold text-red-100 border border-red-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Step</span>
              </button>
            )}
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-red-400 hover:text-red-200 p-1 rounded-lg hover:bg-red-900/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : isProcessing ? (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-center justify-between shadow-lg ring-1 ring-amber-500/20">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                Active Processing Task
              </span>
              <p className="text-xs text-amber-100">{statusText}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
