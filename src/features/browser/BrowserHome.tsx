import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { ExternalLink, Bookmark, ShieldAlert, Sparkles, RefreshCw, Smartphone, Search, Globe, ChevronDown } from 'lucide-react';
import { enginesStore, EngineType, KNOWN_BLOCKED_DOMAINS } from '../../store/engines';
import { settingsStore } from '../../store/settings';
import { addHistoryItem } from '../../lib/db';
import { AddressBar } from './AddressBar';
import { Tabs, BrowserTab } from './Tabs';

interface AIShortcut {
  name: string;
  url: string;
  color: string;
}

const AI_SHORTCUTS: AIShortcut[] = [
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', color: 'from-blue-600 to-indigo-600' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', color: 'from-emerald-600 to-teal-700' },
  { name: 'Claude', url: 'https://claude.ai', color: 'from-amber-600 to-orange-700' },
  { name: 'Gemini', url: 'https://gemini.google.com', color: 'from-blue-500 to-cyan-500' },
  { name: 'Qwen', url: 'https://chat.qwenlm.ai', color: 'from-purple-600 to-violet-700' },
  { name: 'Kimi', url: 'https://kimi.moonshot.cn', color: 'from-rose-600 to-pink-700' },
];

export const BrowserHome: React.FC = () => {
  const engines = useSyncExternalStore(enginesStore.subscribe, enginesStore.getSnapshot);

  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 't1', url: '', title: 'الرئيسية' }
  ]);
  const [activeTabId, setActiveTabId] = useState('t1');
  const [currentEngine, setCurrentEngine] = useState<EngineType>('DIRECT');
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [relaySearchResults, setRelaySearchResults] = useState<any[] | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const timerRef = useRef<any>(null);

  const openInChrome = (targetUrl: string) => {
    try {
      const u = new URL(targetUrl);
      // Android Intent for Chrome
      const chromeIntent = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeIntent;
      setTimeout(() => {
        window.open(targetUrl, '_blank');
      }, 500);
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  const handleNavigate = async (input: string) => {
    setIframeTimedOut(false);
    setRelaySearchResults(null);
    clearTimeout(timerRef.current);

    let targetUrl = input.trim();

    // Check if input is a search query instead of a URL
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.includes('.')) {
      // If Relay search enabled
      if (engines.enabledEngines.RELAY && engines.relay.status === 'ok') {
        setIsLoading(true);
        try {
          const resp = await fetch(`${engines.relay.url}/search?k=${encodeURIComponent(engines.relay.key)}&q=${encodeURIComponent(targetUrl)}`);
          const data = await resp.json();
          setRelaySearchResults(data.results || []);
          setIsLoading(false);
          return;
        } catch {
          // fallback to DuckDuckGo external
        }
      }
      targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Resolve best engine
    const resolvedEngine = enginesStore.resolveEngineForUrl(targetUrl);
    setCurrentEngine(resolvedEngine);

    // Update active tab
    try {
      const domain = new URL(targetUrl).hostname;
      setTabs(tabs.map(t => t.id === activeTabId ? { ...t, url: targetUrl, title: domain } : t));
      addHistoryItem({ url: targetUrl, title: domain, timestamp: Date.now(), engineUsed: resolvedEngine });
    } catch {
      // ignore
    }

    if (resolvedEngine === 'EXTERNAL') {
      openInChrome(targetUrl);
      return;
    }

    // 6 second timeout to catch frame-ancestor blocks
    setIsLoading(true);
    timerRef.current = setTimeout(() => {
      setIframeTimedOut(true);
      setIsLoading(false);
    }, 6000);
  };

  const isBlockedSite = activeTab.url && KNOWN_BLOCKED_DOMAINS.some(d => {
    try {
      return new URL(activeTab.url).hostname.includes(d);
    } catch {
      return false;
    }
  });

  const getEffectiveIframeSrc = () => {
    if (!activeTab.url) return '';
    if (currentEngine === 'RELAY' && engines.relay.url) {
      return `${engines.relay.url}/p?k=${encodeURIComponent(engines.relay.key)}&url=${encodeURIComponent(activeTab.url)}`;
    }
    if (currentEngine === 'CUSTOM' && engines.custom.template) {
      return engines.custom.template.replace('{url}', encodeURIComponent(activeTab.url));
    }
    return activeTab.url;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-light-text dark:text-dark-text text-xs">
      {/* Tabs Bar */}
      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={(id) => {
          const next = tabs.filter(t => t.id !== id);
          setTabs(next);
          if (activeTabId === id) setActiveTabId(next[0].id);
        }}
        onNewTab={() => {
          const newId = 't_' + Date.now();
          setTabs([...tabs, { id: newId, url: '', title: 'صفحة جديدة' }]);
          setActiveTabId(newId);
        }}
      />

      {/* Address Bar */}
      <AddressBar
        currentUrl={activeTab.url}
        isLoading={isLoading}
        canGoBack={false}
        canGoForward={false}
        onNavigate={handleNavigate}
        onReload={() => activeTab.url && handleNavigate(activeTab.url)}
        onGoBack={() => {}}
        onGoForward={() => {}}
        onOpenExternal={() => activeTab.url && openInChrome(activeTab.url)}
      />

      {/* Engine Status Bar if URL is loaded */}
      {activeTab.url && (
        <div className="flex items-center justify-between px-3 py-1 bg-light-surface/90 dark:bg-dark-surface/90 border-b border-light-border dark:border-dark-border text-[11px] text-light-muted dark:text-dark-muted shrink-0">
          <div className="flex items-center gap-1.5">
            <span>المحرك:</span>
            <span className="font-mono font-bold text-blue-500">{currentEngine}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const list: EngineType[] = ['DIRECT', 'RELAY', 'CUSTOM', 'EXTERNAL'];
                const next = list[(list.indexOf(currentEngine) + 1) % list.length];
                setCurrentEngine(next);
                if (next === 'EXTERNAL') openInChrome(activeTab.url);
              }}
              className="hover:text-blue-500 text-[10px] underline"
            >
              جرّب محركاً آخر
            </button>
            <button
              onClick={() => {
                try {
                  const host = new URL(activeTab.url).hostname;
                  enginesStore.setSiteOverride(host, currentEngine);
                } catch {}
              }}
              className="hover:text-blue-500 text-[10px]"
            >
              تذكّر للموقع
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden bg-light-bg dark:bg-dark-bg">
        {!activeTab.url ? (
          /* Blank / Home Shortcuts View */
          <div className="h-full overflow-y-auto p-4 space-y-4 flex flex-col justify-center">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm tracking-tight">بوابة الذكاء الاصطناعي والتصفح</h3>
              <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed max-w-xs mx-auto">
                اختر نموذج الذكاء الاصطناعي لفتحه، واستخدم سحّاب الفطنة لنقل الأكواد مباشرة إلى مشاريعك.
              </p>
            </div>

            {/* AI Shortcuts Grid */}
            <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto w-full">
              {AI_SHORTCUTS.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.url)}
                  className="p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-blue-500/60 transition flex items-center gap-2.5 text-right shadow-sm group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-xs shrink-0 group-hover:scale-105 transition-transform`}>
                    {item.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs block truncate">{item.name}</span>
                    <span className="text-[10px] text-light-muted dark:text-dark-muted font-mono block truncate">
                      chat
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 max-w-xs mx-auto w-full text-right space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Bookmark className="w-4 h-4" />
                <span>كيف يعمل السحّاب مع هذه المواقع؟</span>
              </div>
              <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
                تمنع مواقع الذكاء الاصطناعي التضمين الداخلي لحماية أمانك. افتح المحادثة في Chrome، واضغط إشارة <code>fitna</code> لسحب كل ملفات المشروع بلمسة واحدة!
              </p>
            </div>
          </div>
        ) : isBlockedSite || iframeTimedOut || currentEngine === 'EXTERNAL' ? (
          /* Friendly Blocked / External Card - ZERO WHITE SCREENS */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="font-bold text-sm">هذا الموقع يمنع التضمين داخل النوافذ</h3>
              <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
                تفرض مواقع الذكاء الاصطناعي سياسات حماية متقدمة تمنع فتحها داخل التطبيقات. افتح المحادثة مباشرة في Chrome وشغّل سحّاب الفطنة هناك!
              </p>
            </div>

            <div className="space-y-2 w-full max-w-xs">
              <button
                onClick={() => openInChrome(activeTab.url)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>فتح المحادثة في Chrome</span>
              </button>

              <button
                onClick={() => settingsStore.setActiveTab('clipper')}
                className="w-full py-2 px-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs"
              >
                عرض دليل تثبيت السحّاب 🔖
              </button>
            </div>
          </div>
        ) : (
          /* Direct or Relay Iframe */
          <iframe
            src={getEffectiveIframeSrc()}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            onLoad={() => {
              clearTimeout(timerRef.current);
              setIsLoading(false);
            }}
            className="w-full h-full border-0 bg-white"
            title="متصفح الفطنة"
          />
        )}
      </div>
    </div>
  );
};
