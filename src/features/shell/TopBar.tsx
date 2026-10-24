import React, { useSyncExternalStore } from 'react';
import { FolderGit2, Lock } from 'lucide-react';
import { settingsStore } from '../../store/settings';
import { uiStore } from '../../store/ui';
import { ThemeToggle } from './ThemeToggle';
import { SizeSwitcher } from './SizeSwitcher';

interface TopBarProps {
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onDragStart }) => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  return (
    <header
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      className="flex items-center justify-between px-2.5 py-1.5 border-b border-light-border dark:border-dark-border bg-light-surface/90 dark:bg-dark-surface/90 backdrop-blur select-none cursor-move shrink-0"
    >
      {/* Brand & Status */}
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-5 h-5 rounded-md bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
          ف
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-xs tracking-tight text-light-text dark:text-dark-text">
            الفطنة
          </span>
          <span className="text-[10px] text-light-muted dark:text-dark-muted font-mono">
            v1.0
          </span>
        </div>
      </div>

      {/* Control Actions */}
      <div
        className="flex items-center gap-0.5 cursor-default"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => uiStore.setLibraryOpen(true)}
          className="p-1.5 rounded-lg text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="مكتبة المشاريع المحفوظة"
          aria-label="المشاريع المحفوظة"
        >
          <FolderGit2 className="w-4 h-4" />
        </button>

        {settings.pinHash && (
          <button
            onClick={() => settingsStore.lock()}
            className="p-1.5 rounded-lg text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="قفل التطبيق برمز PIN"
            aria-label="قفل التطبيق"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        <SizeSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
};
