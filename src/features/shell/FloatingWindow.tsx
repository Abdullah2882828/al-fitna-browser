import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { settingsStore } from '../../store/settings';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

interface FloatingWindowProps {
  children: React.ReactNode;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({ children }) => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  const windowRef = useRef<HTMLDivElement>(null);

  // Position state (null = centered via CSS)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(settings.windowPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Drag start coords
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Resize start coords
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number }>({
    mouseX: 0,
    mouseY: 0,
    startW: 0,
    startH: 0,
  });

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!windowRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = windowRef.current.getBoundingClientRect();

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top,
    };
    setIsDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!windowRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    resizeStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startW: settings.windowSize.width,
      startH: settings.windowSize.height,
    };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - dragStartRef.current.mouseX;
        const deltaY = clientY - dragStartRef.current.mouseY;
        const newX = Math.max(10, Math.min(window.innerWidth - 100, dragStartRef.current.startX + deltaX));
        const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.startY + deltaY));
        const newPos = { x: newX, y: newY };
        setPos(newPos);
        settingsStore.setWindowPos(newPos);
      } else if (isResizing) {
        // RTL resize handle on bottom-left, or bottom-right
        const deltaX = clientX - resizeStartRef.current.mouseX;
        const deltaY = clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(280, Math.min(window.innerWidth * 0.95, resizeStartRef.current.startW + deltaX));
        const newH = Math.max(400, Math.min(window.innerHeight * 0.95, resizeStartRef.current.startH + deltaY));
        settingsStore.setWindowSize({ width: Math.round(newW), height: Math.round(newH) });
      }
    };

    const handleEnd = () => {
      if (isDragging) setIsDragging(false);
      if (isResizing) setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, settings.windowSize]);

  // Window dimension calculation
  const targetWidth = Math.min(settings.windowSize.width, window.innerWidth * 0.94);
  const targetHeight = Math.min(settings.windowSize.height, window.innerHeight * 0.92);

  const windowStyle: React.CSSProperties = pos
    ? {
        position: 'absolute',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
      }
    : {
        width: `min(${settings.windowSize.width}px, 94vw)`,
        height: `min(${settings.windowSize.height}px, 90dvh)`,
      };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-2 bg-black/40 backdrop-blur-[2px] overflow-hidden select-none">
      <div
        ref={windowRef}
        style={windowStyle}
        className={`relative flex flex-col rounded-[14px] overflow-hidden border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-2xl transition-[box-shadow] duration-200 ${
          isDragging ? 'shadow-zinc-900/40 ring-1 ring-zinc-400/30' : ''
        }`}
      >
        {/* Top Header Bar */}
        <TopBar onDragStart={handleDragStart} />

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-light-bg/50 dark:bg-dark-bg/50">
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Resize Handle (Bottom-corner) */}
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className="absolute bottom-0 left-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-start p-0.5 opacity-40 hover:opacity-100 transition-opacity"
          title="سحب لتغيير الحجم"
          aria-label="تغيير الحجم"
        >
          <div className="w-2 h-2 border-l-2 border-b-2 border-zinc-500 rounded-bl-sm" />
        </div>
      </div>
    </div>
  );
};
