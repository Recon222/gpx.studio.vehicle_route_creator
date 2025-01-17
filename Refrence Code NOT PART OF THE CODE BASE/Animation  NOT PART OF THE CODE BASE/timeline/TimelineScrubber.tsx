import { useRef, useCallback, useEffect } from 'react';

interface TimelineScrubberProps {
  start: Date;
  end: Date;
  current: Date;
  onChange: (time: Date) => void;
}

export function TimelineScrubber({ start, end, current, onChange }: TimelineScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const totalDuration = end.getTime() - start.getTime();
  const currentProgress = (current.getTime() - start.getTime()) / totalDuration;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    updateTime(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateTime(e);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    isDragging.current = false;
    containerRef.current.releasePointerCapture(e.pointerId);
  }, []);

  const updateTime = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = new Date(start.getTime() + progress * totalDuration);
    onChange(newTime);
  }, [start, totalDuration, onChange]);

  return (
    <div 
      ref={containerRef}
      className="relative h-6 group cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Track Background */}
      <div className="absolute inset-0 my-2.5 rounded-full bg-surface-light overflow-hidden">
        {/* Progress Bar */}
        <div 
          className="absolute h-full bg-primary transition-all duration-75"
          style={{ width: `${currentProgress * 100}%` }}
        />
      </div>

      {/* Thumb */}
      <div 
        className="absolute top-0 -ml-2 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg
                   transform transition-transform duration-75 hover:scale-110"
        style={{ left: `${currentProgress * 100}%` }}
      />
    </div>
  );
}
