import React, { useRef, useState, useEffect } from 'react';
import { CropConfig } from '../types/index.ts';

interface InteractiveCropOverlayProps {
  crop: CropConfig;
  onChangeCrop: (newCrop: CropConfig) => void;
  videoWidth: number;
  videoHeight: number;
  isCropToolActive: boolean;
}

export const InteractiveCropOverlay: React.FC<InteractiveCropOverlayProps> = ({
  crop,
  onChangeCrop,
  videoWidth,
  videoHeight,
  isCropToolActive
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: CropConfig } | null>(null);

  if (!crop.enabled && !isCropToolActive) {
    return null;
  }

  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop }
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStart || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

    let { xPercent, yPercent, widthPercent, heightPercent, preset } = dragStart.crop;

    if (activeHandle === 'move') {
      xPercent = Math.max(0, Math.min(100 - widthPercent, xPercent + deltaXPercent));
      yPercent = Math.max(0, Math.min(100 - heightPercent, yPercent + deltaYPercent));
    } else {
      let newX = xPercent;
      let newY = yPercent;
      let newW = widthPercent;
      let newH = heightPercent;

      // Handle corner and edge resizing
      if (activeHandle.includes('e')) {
        newW = Math.max(10, Math.min(100 - newX, widthPercent + deltaXPercent));
      }
      if (activeHandle.includes('s')) {
        newH = Math.max(10, Math.min(100 - newY, heightPercent + deltaYPercent));
      }
      if (activeHandle.includes('w')) {
        const potentialW = Math.max(10, widthPercent - deltaXPercent);
        const shiftX = widthPercent - potentialW;
        newX = Math.max(0, xPercent + shiftX);
        newW = potentialW;
      }
      if (activeHandle.includes('n')) {
        const potentialH = Math.max(10, heightPercent - deltaYPercent);
        const shiftY = heightPercent - potentialH;
        newY = Math.max(0, yPercent + shiftY);
        newH = potentialH;
      }

      // Aspect ratio lock if preset is specific
      if (preset === '16:9') {
        const targetRatio = 16 / 9;
        const videoRatio = videoWidth / videoHeight;
        newH = Math.max(10, Math.min(100 - newY, (newW * videoRatio) / targetRatio));
      } else if (preset === '9:16') {
        const targetRatio = 9 / 16;
        const videoRatio = videoWidth / videoHeight;
        newH = Math.max(10, Math.min(100 - newY, (newW * videoRatio) / targetRatio));
      } else if (preset === '4:3') {
        const targetRatio = 4 / 3;
        const videoRatio = videoWidth / videoHeight;
        newH = Math.max(10, Math.min(100 - newY, (newW * videoRatio) / targetRatio));
      } else if (preset === '1:1') {
        const targetRatio = 1;
        const videoRatio = videoWidth / videoHeight;
        newH = Math.max(10, Math.min(100 - newY, (newW * videoRatio) / targetRatio));
      }

      // Bounds clamping
      newX = Math.max(0, Math.min(100 - newW, newX));
      newY = Math.max(0, Math.min(100 - newH, newY));

      xPercent = Math.round(newX * 10) / 10;
      yPercent = Math.round(newY * 10) / 10;
      widthPercent = Math.round(newW * 10) / 10;
      heightPercent = Math.round(newH * 10) / 10;
    }

    onChangeCrop({
      ...crop,
      enabled: true,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveHandle(null);
      setDragStart(null);
    }
  };

  const pixelW = Math.round((crop.widthPercent / 100) * videoWidth);
  const pixelH = Math.round((crop.heightPercent / 100) * videoHeight);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 z-30 pointer-events-auto select-none"
    >
      {/* Dimmed backdrop outside crop area (SVG mask) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="crop-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={`${crop.xPercent}%`}
              y={`${crop.yPercent}%`}
              width={`${crop.widthPercent}%`}
              height={`${crop.heightPercent}%`}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#crop-mask)"
        />
      </svg>

      {/* The Active Crop Rectangle */}
      <div
        style={{
          left: `${crop.xPercent}%`,
          top: `${crop.yPercent}%`,
          width: `${crop.widthPercent}%`,
          height: `${crop.heightPercent}%`
        }}
        className="absolute border-2 border-amber-400 shadow-2xl cursor-move group"
        onPointerDown={(e) => handlePointerDown('move', e)}
      >
        {/* Rule-of-Thirds Grid Lines */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
          <div className="border-r border-b border-amber-200/50" />
          <div className="border-r border-b border-amber-200/50" />
          <div className="border-b border-amber-200/50" />
          <div className="border-r border-b border-amber-200/50" />
          <div className="border-r border-b border-amber-200/50" />
          <div className="border-b border-amber-200/50" />
          <div className="border-r border-amber-200/50" />
          <div className="border-r border-amber-200/50" />
          <div />
        </div>

        {/* Dimension Badge */}
        <div className="absolute top-2 left-2 pointer-events-none bg-zinc-950/85 backdrop-blur-sm border border-amber-500/40 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded shadow">
          {pixelW} × {pixelH} {crop.preset !== 'custom' && `(${crop.preset})`}
        </div>

        {/* Corner Handles */}
        <div
          onPointerDown={(e) => handlePointerDown('nw', e)}
          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-400 border-2 border-zinc-950 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('ne', e)}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 border-2 border-zinc-950 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('sw', e)}
          className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-amber-400 border-2 border-zinc-950 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={(e) => handlePointerDown('se', e)}
          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-amber-400 border-2 border-zinc-950 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform"
        />

        {/* Edge Midpoint Handles */}
        <div
          onPointerDown={(e) => handlePointerDown('n', e)}
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400 border border-zinc-950 rounded-full cursor-ns-resize"
        />
        <div
          onPointerDown={(e) => handlePointerDown('s', e)}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400 border border-zinc-950 rounded-full cursor-ns-resize"
        />
        <div
          onPointerDown={(e) => handlePointerDown('w', e)}
          className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-amber-400 border border-zinc-950 rounded-full cursor-ew-resize"
        />
        <div
          onPointerDown={(e) => handlePointerDown('e', e)}
          className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-amber-400 border border-zinc-950 rounded-full cursor-ew-resize"
        />
      </div>
    </div>
  );
};
