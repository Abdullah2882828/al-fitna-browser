import React, { useRef, useState } from 'react';
import { FolderUp, Smartphone, AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { sanitizePath, removeCommonRoot } from '../../lib/parser/sanitizePath';
import { uiStore } from '../../store/ui';

export interface UploadedFile {
  path: string;
  content: string;
  size: number;
}

interface PickFolderProps {
  onFilesSelected: (files: UploadedFile[], folderName: string) => void;
  onSwitchToZip: () => void;
}

export const PickFolder: React.FC<PickFolderProps> = ({ onFilesSelected, onSwitchToZip }) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if browser is likely mobile where webkitdirectory is often unsupported
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);

  const processFileList = async (fileList: FileList, defaultName = 'project') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const results: UploadedFile[] = [];
      const ignoredFolders = ['node_modules/', '.git/', 'dist/', 'build/'];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // webkitRelativePath contains the full relative directory structure
        const relPath = file.webkitRelativePath || file.name;

        // Skip ignored paths
        if (ignoredFolders.some(f => relPath.includes(f))) {
          continue;
        }

        const content = await file.text();
        results.push({
          path: sanitizePath(relPath),
          content,
          size: file.size
        });
      }

      if (results.length === 0) {
        throw new Error('لم يتم العثور على أي ملفات صالحة للقراءة داخل المجلد.');
      }

      // Strip wrapping root if applicable
      const pathsList = results.map(r => r.path);
      const { paths: cleanPaths, rootRemoved } = removeCommonRoot(pathsList);
      results.forEach((r, idx) => {
        r.path = cleanPaths[idx];
      });

      const projectName = rootRemoved || defaultName;
      onFilesSelected(results, projectName);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء قراءة ملفات المجلد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files, 'dropped-folder');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      <div className="space-y-1">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <FolderUp className="w-4 h-4 text-blue-500" />
          <span>رفع مجلد كامل من جهازك</span>
        </h3>
        <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
          اختر مجلد مشروعك مع الحفاظ التام على تسلسل المجلدات والملفات الفرعية لرفعه إلى GitHub.
        </p>
      </div>

      {isMobile && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
          <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-1">
            <p className="font-semibold">تنبيه متصفحات الهواتف:</p>
            <p className="text-[11px] leading-normal">
              بعض متصفحات أندرويد و iOS لا تدعم اختيار مجلد كامل مباشرة. إذا لم يفتح متصفحك المجلد، استعمل خيار ملف ZIP الأضمن لجميع الهواتف.
            </p>
            <button
              onClick={onSwitchToZip}
              className="text-[11px] underline font-bold text-blue-600 dark:text-blue-400"
            >
              التحويل إلى رفع ملف ZIP 🗜️
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 rounded-xl border-2 border-dashed transition-all text-center space-y-3 cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-blue-400'
        }`}
        onClick={() => folderInputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
          <FolderUp className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <p className="font-bold text-xs">اضغط لاختيار مجلد المشروع أو اسحبه وأفلته هنا</p>
          <p className="text-[10px] text-light-muted dark:text-dark-muted">
            يتم استبعاد node_modules و .git و dist تلقائياً
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm"
        >
          {isLoading ? 'جارٍ قراءة الملفات...' : 'تصفح المجلدات'}
        </button>

        {/* Hidden inputs */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={(e) => e.target.files && processFileList(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Alternative: Multi-files picker */}
      <div className="pt-2 text-center">
        <button
          onClick={() => multiFileInputRef.current?.click()}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          أو اختر عدة ملفات منفردة معاً
        </button>
        <input
          ref={multiFileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && processFileList(e.target.files, 'files-bundle')}
          className="hidden"
        />
      </div>
    </div>
  );
};
