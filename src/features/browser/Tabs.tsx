import React from 'react';
import { Plus, X, Globe } from 'lucide-react';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
}

interface TabsProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab
}) => {
  return (
    <div className="flex items-center gap-1 px-1.5 pt-1 bg-light-surface/70 dark:bg-dark-surface/70 border-b border-light-border dark:border-dark-border overflow-x-auto shrink-0 select-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-t-lg max-w-[120px] text-[11px] cursor-pointer transition border-t border-x ${
              isActive
                ? 'bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border text-light-text dark:text-dark-text font-semibold'
                : 'border-transparent text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
            }`}
          >
            <Globe className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate flex-1">{tab.title || 'صفحة جديدة'}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="hover:text-red-500 rounded p-0.5"
                title="إغلاق التبويب"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {tabs.length < 5 && (
        <button
          onClick={onNewTab}
          className="p-1 rounded hover:bg-light-bg dark:hover:bg-dark-bg text-light-muted hover:text-light-text transition"
          title="تبويب جديد (حتى 5 تبويبات)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
