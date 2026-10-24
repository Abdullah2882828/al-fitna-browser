import React, { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import { settingsStore } from '../../store/settings';

export const ThemeToggle: React.FC = () => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  return (
    <button
      onClick={() => settingsStore.toggleTheme()}
      className="p-1.5 rounded-lg transition-colors text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 min-w-[36px] min-h-[36px] flex items-center justify-center"
      title={settings.theme === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
      aria-label="تبديل المظهر"
    >
      {settings.theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
};
