import React, { useState, useSyncExternalStore } from 'react';
import {
  Settings,
  Shield,
  Server,
  KeyRound,
  Download,
  Upload,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Unlock,
  Trash2,
  Activity
} from 'lucide-react';
import { settingsStore } from '../../store/settings';
import { enginesStore } from '../../store/engines';
import { hasSavedToken, clearSavedToken } from '../../lib/secrets';
import { uiStore } from '../../store/ui';

interface SettingsScreenProps {
  onOpenSelfTest: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenSelfTest }) => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  const engines = useSyncExternalStore(enginesStore.subscribe, enginesStore.getSnapshot);

  // Relay inputs
  const [relayUrl, setRelayUrl] = useState(engines.relay.url);
  const [relayKey, setRelayKey] = useState(engines.relay.key);
  const [isCheckingRelay, setIsCheckingRelay] = useState(false);

  // Custom template
  const [customTpl, setCustomTpl] = useState(engines.custom.template);

  // PIN
  const [pinInput, setPinInput] = useState('');

  const handleSaveRelay = (e: React.FormEvent) => {
    e.preventDefault();
    enginesStore.setRelayConfig({
      url: relayUrl.trim(),
      key: relayKey.trim()
    });
    uiStore.showToast('تم حفظ إعدادات خادم الترحيل (Relay)', 'success');
  };

  const handleTestRelay = async () => {
    setIsCheckingRelay(true);
    const ok = await enginesStore.checkRelayHealth();
    setIsCheckingRelay(false);
    if (ok) {
      uiStore.showToast('اتصال خادم Relay سليم ويعمل بكفاءة! ✅', 'success');
    } else {
      uiStore.showToast('فشل الاتصال بخادم Relay. تأكد من صحة الرابط والمفتاح.', 'error');
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    enginesStore.setCustomTemplate(customTpl.trim());
    uiStore.showToast('تم حفظ قالب الوسيط المخصص', 'success');
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      uiStore.showToast('يجب أن يتكون رمز PIN من 4 أرقام على الأقل', 'warn');
      return;
    }
    settingsStore.setPin(pinInput);
    setPinInput('');
    uiStore.showToast('تم تفعيل قفل التطبيق برمز PIN', 'success');
  };

  const handleRemovePin = () => {
    settingsStore.setPin('');
    uiStore.showToast('تم إلغاء قفل PIN', 'info');
  };

  // Export Settings (excluding token)
  const handleExportSettings = () => {
    const exported = {
      app: 'al-fitna-settings',
      version: 1,
      theme: settings.theme,
      preset: settings.preset,
      relay: { url: engines.relay.url, key: engines.relay.key },
      custom: engines.custom
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitna-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Settings
  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.theme) settingsStore.setTheme(data.theme);
        if (data.preset) settingsStore.setPreset(data.preset);
        if (data.relay) enginesStore.setRelayConfig(data.relay);
        if (data.custom?.template) enginesStore.setCustomTemplate(data.custom.template);
        uiStore.showToast('تم استيراد الإعدادات بنجاح!', 'success');
      } catch {
        uiStore.showToast('ملف الإعدادات غير صالح', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-blue-500" />
          <span>إعدادات التطبيق</span>
        </h2>

        {/* Self-Test Quick Button */}
        <button
          onClick={onOpenSelfTest}
          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 text-[11px] transition shadow-sm"
        >
          <Play className="w-3 h-3" />
          <span>الفحص الذاتي (Self-Test)</span>
        </button>
      </div>

      {/* 1. Engines & Proxy Settings */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-xs">خادم الترحيل (Cloudflare Relay)</h3>
          </div>
          {/* Health indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                engines.relay.status === 'ok'
                  ? 'bg-emerald-500'
                  : engines.relay.status === 'fail'
                  ? 'bg-red-500'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="text-[10px] text-light-muted dark:text-dark-muted font-mono">
              {engines.relay.status === 'ok' ? 'متصل' : engines.relay.status === 'fail' ? 'معطل' : 'غير مفحوص'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveRelay} className="space-y-2">
          <div>
            <label className="block text-[11px] text-light-muted dark:text-dark-muted mb-0.5">رابط خادم Worker:</label>
            <input
              type="url"
              dir="ltr"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="https://al-fitna-relay.your-name.workers.dev"
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-light-muted dark:text-dark-muted mb-0.5">مفتاح السر (Key):</label>
            <input
              type="password"
              dir="ltr"
              value={relayKey}
              onChange={(e) => setRelayKey(e.target.value)}
              placeholder="k=..."
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 text-xs font-medium"
            >
              حفظ الإعدادات
            </button>
            <button
              type="button"
              onClick={handleTestRelay}
              disabled={isCheckingRelay || !relayUrl}
              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {isCheckingRelay ? 'جارٍ الفحص...' : 'اختبار الاتصال'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Custom Proxy Template */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-2">
        <h3 className="font-bold text-xs">وسيط مخصص (Custom Template)</h3>
        <p className="text-[10px] text-light-muted dark:text-dark-muted">
          قالب الرابط مع استبدال {'{url}'} (مثلاً: https://proxy.example.com?target={'{url}'})
        </p>
        <form onSubmit={handleSaveCustom} className="flex gap-1.5">
          <input
            type="text"
            dir="ltr"
            value={customTpl}
            onChange={(e) => setCustomTpl(e.target.value)}
            placeholder="https://myproxy.com/?url={url}"
            className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
          />
          <button type="submit" className="px-3 py-1 bg-zinc-800 text-white rounded-lg text-xs">
            حفظ
          </button>
        </form>
      </div>

      {/* 3. Security & PIN Lock */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-xs">قفل التطبيق برمز PIN</h3>
          </div>
          {settings.pinHash ? (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <Lock className="w-3 h-3" /> مفعل
            </span>
          ) : (
            <span className="text-[10px] text-light-muted dark:text-dark-muted flex items-center gap-0.5">
              <Unlock className="w-3 h-3" /> معطل
            </span>
          )}
        </div>

        {settings.pinHash ? (
          <button
            onClick={handleRemovePin}
            className="w-full py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition text-xs flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>إلغاء قفل PIN</span>
          </button>
        ) : (
          <form onSubmit={handleSetPin} className="flex gap-1.5">
            <input
              type="password"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="رمز PIN (4-8 أرقام)"
              className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
            <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
              تفعيل القفل
            </button>
          </form>
        )}
      </div>

      {/* 4. Settings Export/Import */}
      <div className="flex gap-2">
        <button
          onClick={handleExportSettings}
          className="flex-1 py-2 px-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span>تصدير الإعدادات</span>
        </button>

        <label className="flex-1 py-2 px-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-emerald-500" />
          <span>استيراد إعدادات</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImportSettings}
            className="hidden"
          />
        </label>
      </div>

      {/* 5. Activity Log */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-xs">سجل النشاط المحلي (Activity Log)</h3>
          </div>
          <button
            onClick={() => settingsStore.clearLogs()}
            className="text-[10px] text-light-muted hover:text-red-500"
          >
            مسح
          </button>
        </div>

        <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
          {settings.activityLogs.length === 0 ? (
            <p className="text-light-muted dark:text-dark-muted text-center py-2">لا توجد سجلات بعد.</p>
          ) : (
            settings.activityLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-light-border/40 dark:border-dark-border/40 pb-0.5">
                <span className="truncate">{log.text}</span>
                <span className="text-light-muted dark:text-dark-muted shrink-0 text-[9px] mr-1">
                  {new Date(log.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
