import React, { useRef, useState } from 'react';
import { Archive, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { extractZipFile } from '../../lib/zip';
import { UploadedFile } from './PickFolder';
import { uiStore } from '../../store/ui';

interface PickZipProps {
  onFilesExtracted: (files: UploadedFile[], zipName: string) => void;
  onSwitchToFolder: () => void;
}

export const PickZip: React.FC<PickZipProps> = ({ onFilesExtracted, onSwitchToFolder }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processZipFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { files, ignoredCount } = await extractZipFile(file);
      if (files.length === 0) {
        throw new Error('لم يتم العثور على أي ملفات نصية صالحة داخل ملف ZIP.');
      }

      const zipBaseName = file.name.replace(/\.zip$/i, '');
      uiStore.showToast(`تم فك ضغط ${files.length} ملف بنجاح (تم تجاهل ${ignoredCount} ملف غير ضروري)`, 'success');
      onFilesExtracted(files, zipBaseName);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء فك ضغط ملف ZIP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      <div className="space-y-1">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Archive className="w-4 h-4 text-emerald-500" />
          <span>رفع ملف مضغوط (ZIP)</span>
        </h3>
        <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
          الخيار الأفضل والمثالي للهواتف المحمولة؛ اختر أي أرشيف .zip وسيقوم التطبيق بفكه ملفاً ملفاً واستخراج محتوياته بدقة.
        </p>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Upload Box */}
      <div
        className="p-8 rounded-xl border-2 border-dashed border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-emerald-500 transition text-center space-y-3 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Archive className="w-6 h-6" />}
        </div>

        <div className="space-y-1">
          <p className="font-bold text-xs">اضغط لاختيار ملف .zip من ذاكرة الهاتف أو الحاسوب</p>
          <p className="text-[10px] text-light-muted dark:text-dark-muted">
            يتم تلقائياً تصفية ملفات النظام مثل __MACOSX و .DS_Store
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm"
        >
          {isLoading ? 'جارٍ فك الضغط...' : 'اختيار ملف ZIP'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={(e) => e.target.files?.[0] && processZipFile(e.target.files[0])}
          className="hidden"
        />
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={onSwitchToFolder}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          أو اختيار مجلد عادي (لأجهزة الحاسوب)
        </button>
      </div>
    </div>
  );
};
