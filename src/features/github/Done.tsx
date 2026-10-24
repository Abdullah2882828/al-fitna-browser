import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, Copy, Check, Globe, ArrowRight, Sparkles } from 'lucide-react';
import { enableGitHubPages } from '../../lib/githubApi';
import { uiStore } from '../../store/ui';

interface DoneProps {
  repoUrl: string;
  commitUrl?: string;
  owner: string;
  repo: string;
  branch: string;
  token: string;
  onReset: () => void;
}

export const Done: React.FC<DoneProps> = ({
  repoUrl,
  commitUrl,
  owner,
  repo,
  branch,
  token,
  onReset
}) => {
  const [copied, setCopied] = useState(false);
  const [isEnablingPages, setIsEnablingPages] = useState(false);
  const [pagesStatus, setPagesStatus] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(repoUrl);
    setCopied(true);
    uiStore.showToast('تم نسخ رابط المستودع للحافظة', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnablePages = async () => {
    setIsEnablingPages(true);
    setPagesStatus(null);
    try {
      await enableGitHubPages(token, owner, repo, branch);
      setPagesStatus(`تم تفعيل GitHub Pages بنجاح! سينشر موقعك قريباً على: https://${owner}.github.io/${repo}/`);
      uiStore.showToast('تم تفعيل GitHub Pages بنجاح!', 'success');
    } catch (err: any) {
      setPagesStatus(`تنبيه: ${err.message || 'قد يتطلب تفعيل Pages ضبطه يدوياً من إعدادات المستودع'}`);
    } finally {
      setIsEnablingPages(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center text-light-text dark:text-dark-text text-xs flex flex-col justify-center">
      <div className="p-3.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-14 h-14 mx-auto flex items-center justify-center animate-bounce">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-base tracking-tight">تهانينا! تم رفع مشروعك إلى GitHub</h3>
        <p className="text-light-muted dark:text-dark-muted text-xs">
          تم إنشاء الـ Commit وتحديث المستودع بنجاح تام.
        </p>
      </div>

      {/* Repo Link Card */}
      <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-right space-y-2 max-w-sm mx-auto w-full">
        <span className="text-[11px] text-light-muted dark:text-dark-muted block">رابط المستودع:</span>
        <div className="flex items-center gap-1.5 bg-light-bg dark:bg-dark-bg p-2 rounded-lg border border-light-border dark:border-dark-border">
          <input
            type="text"
            readOnly
            dir="ltr"
            value={repoUrl}
            className="flex-1 bg-transparent font-mono text-[11px] focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="p-1 rounded text-light-muted hover:text-light-text transition"
            title="نسخ الرابط"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 text-xs transition shadow-sm"
          >
            <span>فتح في GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {commitUrl && (
            <a
              href={commitUrl}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center justify-center"
              title="معاينة التغييرات في الـ Commit"
            >
              عرض التغييرات
            </a>
          )}
        </div>
      </div>

      {/* GitHub Pages Feature */}
      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-right space-y-2 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
          <Globe className="w-4 h-4" />
          <span>نشر كموقع ويب (GitHub Pages)</span>
        </div>
        <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
          إذا كان مشروعك تطبيق ويب يحتوي على index.html، يمكنك تفعيل استضافة GitHub Pages المجانية بضغطة زر:
        </p>
        <button
          onClick={handleEnablePages}
          disabled={isEnablingPages}
          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isEnablingPages ? 'جارٍ التفعيل...' : 'تفعيل GitHub Pages الآن'}</span>
        </button>

        {pagesStatus && (
          <p className="text-[11px] font-mono p-2 bg-light-surface dark:bg-dark-surface rounded border border-light-border dark:border-dark-border text-light-text dark:text-dark-text mt-2 leading-normal">
            {pagesStatus}
          </p>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="text-xs text-light-muted dark:text-dark-muted hover:text-light-text underline max-w-sm mx-auto pt-2"
      >
        بدء استيراد مشروع جديد
      </button>
    </div>
  );
};
