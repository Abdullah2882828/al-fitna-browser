import React, { useState } from 'react';
import { Search, Globe, RotateCw, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigate: (input: string) => void;
  onReload: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onOpenExternal: () => void;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  currentUrl,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onReload,
  onGoBack,
  onGoForward,
  onOpenExternal
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onNavigate(inputVal.trim());
    }
  };

  return (
    <div className="flex items-center gap-1 p-1.5 border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0 text-xs">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text disabled:opacity-30"
          title="رجوع"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text disabled:opacity-30"
          title="تقدم"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onReload}
          className={`p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text ${
            isLoading ? 'animate-spin text-blue-500' : ''
          }`}
          title="إعادة تحميل"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* URL or Search Input Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center relative">
        <input
          type="text"
          dir="ltr"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="ابحث أو أدخل رابط الموقع (https://...)"
          className="w-full pl-7 pr-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 text-light-text dark:text-dark-text"
        />
        <div className="absolute left-2 text-light-muted dark:text-dark-muted pointer-events-none">
          {inputVal.startsWith('http') ? <Globe className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
        </div>
      </form>

      {/* External Open in Chrome Button */}
      <button
        onClick={onOpenExternal}
        className="p-1.5 rounded-lg text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-light-bg/80 dark:hover:bg-dark-bg/80 transition"
        title="فتح في متصفح Chrome الأصلي"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
