import React, { useState, useEffect } from 'react';
import { Clipboard, Upload, ArrowRight, AlertCircle, FileText, CheckCircle2, Link2 } from 'lucide-react';
import { decodeClipPayload, ClipPayloadV1 } from '../../lib/clipCodec';
import { parseClipPayload, parseRawText, ParsedProjectResult } from '../../lib/parser/parseClip';
import { projectsStore } from '../../store/projects';
import { uiStore } from '../../store/ui';

interface ImportReceiverProps {
  onProjectReady: (parsed: ParsedProjectResult) => void;
  onBackToGuide: () => void;
}

export const ImportReceiver: React.FC<ImportReceiverProps> = ({ onProjectReady, onBackToGuide }) => {
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stagingPayload, setStagingPayload] = useState<ClipPayloadV1 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Process URL hash #fitna= on mount & PWA share_target params
  useEffect(() => {
    const handleHashAndShare = async () => {
      // Check hash #fitna=
      const hash = window.location.hash;
      if (hash && hash.includes('#fitna=')) {
        const encoded = hash.split('#fitna=')[1];
        if (encoded) {
          try {
            setIsProcessing(true);
            const decoded = await decodeClipPayload(encoded);
            setStagingPayload(decoded);
            uiStore.showToast('تم استقبال الحمولة من السحّاب بنجاح!', 'success');
          } catch (err: any) {
            setErrorMsg('فشل فك ترميز الحمولة من الرابط: ' + err.message);
          } finally {
            setIsProcessing(false);
            // Immediately clean URL hash
            try {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch {
              // ignore
            }
          }
        }
      }

      // Check PWA Share Target query parameters (?text=... or ?url=...)
      const searchParams = new URLSearchParams(window.location.search);
      const sharedText = searchParams.get('text');
      const sharedUrl = searchParams.get('url');
      if (sharedText || sharedUrl) {
        const combined = [sharedUrl, sharedText].filter(Boolean).join('\n\n');
        setPasteText(combined);
        uiStore.showToast('تم استقبال البيانات من ميزة المشاركة في أندرويد', 'info');
        // Clean query params
        try {
          history.replaceState(null, '', window.location.pathname);
        } catch {
          // ignore
        }
      }
    };

    handleHashAndShare();
  }, []);

  // 2. Handle Clipboard Import
  const handleClipboardImport = async () => {
    setErrorMsg(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setErrorMsg('الحافظة فارغة حالياً.');
        return;
      }
      processInputString(text);
    } catch {
      setErrorMsg('تعذر قراءة الحافظة تلقائياً. يرجى لصق النص يدوياً في المربع أدناه.');
    }
  };

  // 3. Process arbitrary input string (encoded or raw text)
  const processInputString = async (input: string) => {
    const trimmed = input.trim();
    setErrorMsg(null);

    // Is it a bookmarklet payload? (FITNA-IMPORT:F0... or FITNA-IMPORT:F1... or direct F0./F1.)
    if (trimmed.startsWith('FITNA-IMPORT:') || trimmed.startsWith('F0.') || trimmed.startsWith('F1.')) {
      const cleanData = trimmed.replace(/^FITNA-IMPORT:/, '');
      try {
        setIsProcessing(true);
        const decoded = await decodeClipPayload(cleanData);
        setStagingPayload(decoded);
        uiStore.showToast('تم فك تشفير الحمولة بنجاح!', 'success');
      } catch (err: any) {
        setErrorMsg('فشل فك ترميز الحمولة: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Is it unencoded JSON payload?
    if (trimmed.startsWith('{') && trimmed.includes('"fitna-clipper"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.app === 'fitna-clipper' && parsed.v === 1) {
          setStagingPayload(parsed);
          return;
        }
      } catch {
        // continue to raw parser
      }
    }

    // Otherwise, treat as raw Markdown or code text with fallback parser
    try {
      const parsed = parseRawText(trimmed);
      onProjectReady(parsed);
    } catch (err: any) {
      setErrorMsg('تعذر تحليل النص المدخل: ' + err.message);
    }
  };

  // 4. File input (.json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        processInputString(content);
      }
    };
    reader.onerror = () => {
      setErrorMsg('حدث خطأ أثناء قراءة الملف المحدد.');
    };
    reader.readAsText(file);
  };

  // Confirm staging payload and transition to Review
  const handleProceedToReview = () => {
    if (!stagingPayload) return;
    const parsed = parseClipPayload(stagingPayload);
    onProjectReady(parsed);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
          <span>استيراد كود المشروع</span>
        </h2>
        <button
          onClick={onBackToGuide}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>دليل السحّاب</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Staging Summary Card (when payload is received from Hash, Clipboard or File) */}
      {stagingPayload ? (
        <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-xs">تم استقبال كتل الكود بنجاح</h3>
          </div>

          <div className="bg-light-bg dark:bg-dark-bg p-2.5 rounded-lg border border-light-border dark:border-dark-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-light-muted dark:text-dark-muted">المصدر:</span>
              <span className="font-mono text-[11px] truncate max-w-[180px]">{stagingPayload.src?.host || 'محلي'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-muted dark:text-dark-muted">عنوان المحادثة:</span>
              <span className="font-medium truncate max-w-[180px]">{stagingPayload.src?.title || 'بدون عنوان'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-muted dark:text-dark-muted">عدد الكتل المستخرجة:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{stagingPayload.blocks?.length || 0} كتلة</span>
            </div>
          </div>

          <button
            onClick={handleProceedToReview}
            className="w-full py-2.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-sm min-h-[40px]"
          >
            <span>الانتقال لمراجعة الملفات وهيكلتها</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Quick Import Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleClipboardImport}
              disabled={isProcessing}
              className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition flex flex-col items-center justify-center gap-1.5 text-center shadow-sm min-h-[72px]"
            >
              <Clipboard className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-semibold">استيراد من الحافظة</span>
              <span className="text-[10px] text-light-muted dark:text-dark-muted">FITNA-IMPORT أو نص</span>
            </button>

            <label className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-blue-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer shadow-sm min-h-[72px]">
              <Upload className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-semibold">ملف JSON</span>
              <span className="text-[10px] text-light-muted dark:text-dark-muted">من حمولة سحّاب سابقة</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Paste Raw Text Box */}
          <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-light-muted dark:text-dark-muted" />
                <span>أو الصق رد المحادثة النصي مباشرة:</span>
              </span>
            </div>

            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="الصق هنا كود الرد الكامل، أو كتل Markdown (```) أو حمولة الفطنة..."
              className="w-full p-2.5 text-xs font-mono bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
            />

            <button
              onClick={() => processInputString(pasteText)}
              disabled={!pasteText.trim() || isProcessing}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition min-h-[36px]"
            >
              <span>{isProcessing ? 'جارٍ التحليل...' : 'تحليل واستخراج الملفات'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
