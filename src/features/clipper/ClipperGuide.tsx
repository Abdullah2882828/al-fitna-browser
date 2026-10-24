import React, { useState, useSyncExternalStore } from 'react';
import { Copy, Check, ExternalLink, AlertTriangle, Bookmark, Sparkles, HelpCircle, Code } from 'lucide-react';
import { buildBookmarklet } from '../../lib/buildBookmarklet';
import { settingsStore } from '../../store/settings';
import { uiStore } from '../../store/ui';

interface ClipperGuideProps {
  onOpenManualImport: () => void;
  onLoadExampleFixture: () => void;
}

export const ClipperGuide: React.FC<ClipperGuideProps> = ({
  onOpenManualImport,
  onLoadExampleFixture
}) => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  const [copied, setCopied] = useState(false);
  const [customUrl, setCustomUrl] = useState(settings.fitnaUrlOverride || '');
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

  // Check environment (localhost, iframe, AI Studio preview)
  const isLocalOrIframe = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.self !== window.top ||
    window.location.hostname.includes('.run.app')
  );

  const { bookmarkletUrl, byteSize } = buildBookmarklet(customUrl || undefined);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletUrl);
      setCopied(true);
      uiStore.showToast('تم نسخ كود السحّاب بنجاح!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = bookmarkletUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      uiStore.showToast('تم نسخ كود السحّاب بنجاح!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    settingsStore.setFitnaUrlOverride(customUrl.trim());
    uiStore.showToast('تم تحديث الرابط الهدف للسحّاب', 'info');
  };

  const openDemoChat = () => {
    window.open('./demo-chat.html', '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text">
      {/* Hero Card */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">سحّاب الفطنة (Bookmarklet)</h1>
            <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5 leading-relaxed">
              إشارة مرجعية تعمل داخل Chrome على صفحات محادثات الذكاء الاصطناعي (DeepSeek, ChatGPT, Gemini, Claude...) لتسحب كتل الكود وترسلها فوراً للفطنة.
            </p>
          </div>
        </div>

        {/* Warning if running in preview / localhost */}
        {isLocalOrIframe && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold">تنبيه عنوان الفطنة:</p>
              <p className="text-[11px] leading-normal">
                أنت تشغل الفطنة الآن في بيئة معاينة أو محلية. لنقل المشاريع بدقة، انسخ الرابط الحقيقي لمشروعك المنشور على GitHub Pages أو اضبط الرابط الهدف أدناه.
              </p>
              <button
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                className="text-[11px] underline font-medium hover:text-amber-800 dark:hover:text-amber-200"
              >
                {showAdvancedUrl ? 'إخفاء ضبط الرابط' : 'تعديل الرابط الهدف يدوياً'}
              </button>
            </div>
          </div>
        )}

        {/* Custom URL Input */}
        {showAdvancedUrl && (
          <form onSubmit={handleSaveCustomUrl} className="mt-2.5 flex gap-1.5">
            <input
              type="url"
              dir="ltr"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://user.github.io/al-fitna/"
              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition"
            >
              حفظ
            </button>
          </form>
        )}

        {/* Copy Code Box */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-light-muted dark:text-dark-muted mb-1 px-0.5">
            <span>كود الإشارة المرجعية المجمّع</span>
            <span className="font-mono">{byteSize.toLocaleString()} بايت</span>
          </div>
          <div className="relative">
            <textarea
              readOnly
              rows={2}
              dir="ltr"
              value={bookmarkletUrl}
              className="w-full p-2 text-[10px] font-mono bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-muted dark:text-dark-muted focus:outline-none resize-none select-all"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCopyCode}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-sm min-h-[38px]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ للحافظة!' : 'نسخ كود السحّاب'}</span>
            </button>

            <button
              onClick={openDemoChat}
              className="py-2 px-3 text-xs font-semibold rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border hover:bg-zinc-200/50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition min-h-[38px]"
              title="فتح صفحة محادثة تجريبية لاختبار السحّاب"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>جرّب الآن</span>
            </button>
          </div>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-light-text dark:text-dark-text">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span>خطوات التثبيت في Chrome على الهاتف:</span>
        </div>

        <ol className="text-xs space-y-2 text-light-muted dark:text-dark-muted list-decimal list-inside pr-1 leading-relaxed">
          <li>
            <strong className="text-light-text dark:text-dark-text">افتح الفطنة في Chrome</strong> من رابطها الحقيقي.
          </li>
          <li>
            اضغط الزر الأزرق أعلاه <strong className="text-light-text dark:text-dark-text">«نسخ كود السحّاب»</strong>.
          </li>
          <li>
            في Chrome، اضغط زر القائمة <strong className="font-mono text-light-text dark:text-dark-text">⋮</strong> ثم النجمة <strong className="text-light-text dark:text-dark-text">⭐</strong> لحفظ أي صفحة كإشارة مرجعية.
          </li>
          <li>
            افتح <strong className="font-mono text-light-text dark:text-dark-text">⋮</strong> ← <strong>الإشارات المرجعية</strong> ← اضغط مطولاً على الإشارة التي أضفتها ← <strong>تعديل</strong>. غيّر الاسم إلى <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-mono font-bold">fitna</code> ثم امسح الرابط وألصق الكود المنسوخ.
          </li>
          <li>
            افتح أي محادثة ذكاء اصطناعي. اكتب <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-mono font-bold">fitna</code> في شريط عنوان Chrome واختر الإشارة المرجعية من الاقتراحات (التي بجانبها ⭐)، ولا تضغط Enter للبحث.
          </li>
        </ol>

        {/* Helpful Tips */}
        <div className="pt-2 border-t border-light-border dark:border-dark-border text-[11px] space-y-1 text-light-muted dark:text-dark-muted">
          <p>⚠️ <strong>ملاحظة هامة:</strong> في Chrome للأندرويد، الإشارة تعمل فقط عند كتابة اسمها في شريط العنوان واختيارها من القائمة المنسدلة.</p>
          <p>🔒 <strong>الأمان:</strong> السحّاب يعمل محلياً تماماً داخل صفحتك دون أي طلب شبكي أو خادم خارجي.</p>
        </div>
      </div>

      {/* Alternative Import Actions */}
      <div className="flex gap-2">
        <button
          onClick={onOpenManualImport}
          className="flex-1 py-2 px-2.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition flex items-center justify-center gap-1.5 min-h-[36px]"
        >
          <Code className="w-3.5 h-3.5 text-emerald-500" />
          <span>لصق أو استيراد ملف</span>
        </button>

        <button
          onClick={onLoadExampleFixture}
          className="flex-1 py-2 px-2.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition flex items-center justify-center gap-1.5 min-h-[36px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>تحميل مشروع تجريبي</span>
        </button>
      </div>
    </div>
  );
};
