import React, { useSyncExternalStore } from 'react';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';
import { settingsStore, WindowSizePreset } from '../../store/settings';

export const SizeSwitcher: React.FC = () => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  const cycleSize = () => {
    const sequence: WindowSizePreset[] = ['compact', 'medium', 'large'];
    const currentIdx = sequence.indexOf(settings.preset);
    const nextPreset = sequence[(currentIdx + 1) % sequence.length];
    settingsStore.setPreset(nextPreset);
  };

  const getLabel = () => {
    switch (settings.preset) {
      case 'compact':
        return '280×420';
      case 'medium':
        return '320×500';
      case 'large':
        return '360×620';
    }
  };

  return (
    <button
      onClick={cycleSize}
      className="px-2 py-1 text-xs rounded-lg flex items-center gap-1 font-mono transition-colors text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 min-h-[36px]"
      title={`تغيير حجم النافذة (الحالي: ${getLabel()})`}
      aria-label="تغيير حجم النافذة"
    >
      {settings.preset === 'compact' && <Smartphone className="w-3.5 h-3.5" />}
      {settings.preset === 'medium' && <Minimize2 className="w-3.5 h-3.5" />}
      {settings.preset === 'large' && <Maximize2 className="w-3.5 h-3.5" />}
      <span className="text-[11px] hidden sm:inline">{getLabel()}</span>
    </button>
  );
};
