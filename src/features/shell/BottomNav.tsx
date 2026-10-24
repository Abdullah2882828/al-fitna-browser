import React, { useSyncExternalStore } from 'react';
import { Globe, Download, Cloud, FolderUp, Settings } from 'lucide-react';
import { settingsStore, SettingsState } from '../../store/settings';

interface NavItem {
  id: SettingsState['activeTab'];
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'browser', label: 'تصفح', icon: Globe },
  { id: 'clipper', label: 'سحّاب', icon: Download },
  { id: 'github', label: 'GitHub', icon: Cloud },
  { id: 'uploader', label: 'رفع', icon: FolderUp },
  { id: 'settings', label: 'إعدادات', icon: Settings }
];

export const BottomNav: React.FC = () => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  return (
    <nav
      className="flex items-center justify-around px-1 py-1 border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0 safe-bottom"
      aria-label="شريط التنقل الرئيسي"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = settings.activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => settingsStore.setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg transition-all min-h-[44px] ${
              isActive
                ? 'text-light-text dark:text-dark-text font-bold'
                : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              className={`p-1 rounded-md transition-all ${
                isActive
                  ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 scale-105'
                  : ''
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
