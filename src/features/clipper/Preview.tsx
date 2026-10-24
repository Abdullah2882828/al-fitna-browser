import React, { useState } from 'react';
import { Edit2, FolderInput, Copy, AlertTriangle, Check, Layers } from 'lucide-react';
import { ProjectFile } from '../../store/projects';
import { sanitizePath } from '../../lib/parser/sanitizePath';
import { uiStore } from '../../store/ui';

interface PreviewProps {
  file: ProjectFile;
  allFiles: ProjectFile[];
  onUpdateFile: (updated: Partial<ProjectFile>) => void;
  onMergeWithFile: (targetPath: string) => void;
}

export const Preview: React.FC<PreviewProps> = ({
  file,
  allFiles,
  onUpdateFile,
  onMergeWithFile
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempPath, setTempPath] = useState(file.path);
  const [isMoving, setIsMoving] = useState(false);
  const [folderPrefix, setFolderPrefix] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Line count for editor
  const lineCount = (file.content.match(/\n/g) || []).length + 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizePath(tempPath);
    onUpdateFile({ path: clean, confidence: 'high' });
    setIsRenaming(false);
    uiStore.showToast(`تم تغيير اسم الملف إلى ${clean}`, 'info');
  };

  const handleApplyFolderMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPrefix.trim()) return;
    const baseName = file.path.split('/').pop() || file.path;
    const cleanFolder = sanitizePath(folderPrefix);
    const newPath = `${cleanFolder}/${baseName}`;
    onUpdateFile({ path: newPath, confidence: 'high' });
    setIsMoving(false);
    uiStore.showToast(`تم نقل الملف إلى ${newPath}`, 'info');
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface overflow-hidden">
      {/* File Action Bar */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border bg-light-bg/40 dark:bg-dark-bg/40 shrink-0 text-xs">
        {isRenaming ? (
          <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 flex-1 max-w-[280px]">
            <input
              type="text"
              dir="ltr"
              value={tempPath}
              onChange={(e) => setTempPath(e.target.value)}
              className="flex-1 px-2 py-0.5 text-xs font-mono rounded border border-blue-500 bg-light-surface dark:bg-dark-surface focus:outline-none"
              autoFocus
            />
            <button type="submit" className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px]">
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setIsRenaming(false)}
              className="px-1.5 py-0.5 text-light-muted dark:text-dark-muted"
            >
              إلغاء
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs font-bold text-light-text dark:text-dark-text truncate" dir="ltr">
              {file.path}
            </span>
            <button
              onClick={() => {
                setTempPath(file.path);
                setIsRenaming(true);
              }}
              className="p-1 text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text"
              title="تعديل اسم ومسار الملف"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMoving(!isMoving)}
            className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text transition"
            title="نقل لمجلد"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowMergeModal(true)}
            className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text transition"
            title="دمج مع ملف آخر"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyCode}
            className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text transition"
            title="نسخ محتوى الملف"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick Move Input */}
      {isMoving && (
        <form onSubmit={handleApplyFolderMove} className="flex gap-1.5 p-2 bg-blue-500/5 border-b border-light-border dark:border-dark-border text-xs">
          <input
            type="text"
            dir="ltr"
            placeholder="اسم المجلد (مثلاً: src/components)"
            value={folderPrefix}
            onChange={(e) => setFolderPrefix(e.target.value)}
            className="flex-1 px-2 py-1 text-xs font-mono rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface"
          />
          <button type="submit" className="px-2.5 py-1 bg-zinc-800 text-white rounded text-[11px]">
            نقل
          </button>
        </form>
      )}

      {/* Warnings Banner */}
      {file.warnings && file.warnings.length > 0 && (
        <div className="p-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] space-y-0.5">
          {file.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-xs direction-ltr text-left relative bg-light-bg dark:bg-dark-bg" dir="ltr">
        {/* Line Numbers Column */}
        <div className="py-2.5 px-2 select-none text-right font-mono text-[11px] text-light-muted/60 dark:text-dark-muted/50 border-r border-light-border/60 dark:border-dark-border/60 shrink-0 whitespace-pre">
          {lineNumbers}
        </div>

        {/* Text Area */}
        <textarea
          value={file.content}
          onChange={(e) => onUpdateFile({ content: e.target.value })}
          spellCheck={false}
          className="flex-1 p-2.5 bg-transparent resize-none border-0 focus:outline-none font-mono text-[12px] leading-relaxed text-light-text dark:text-dark-text whitespace-pre overflow-auto"
        />
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center p-4">
          <div className="bg-light-surface dark:bg-dark-surface rounded-xl p-3 border border-light-border dark:border-dark-border max-w-sm w-full space-y-3">
            <h4 className="font-bold text-xs">اختر الملف المراد دمجه مع {file.path}:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allFiles.filter(f => f.path !== file.path).map(f => (
                <button
                  key={f.path}
                  onClick={() => {
                    onMergeWithFile(f.path);
                    setShowMergeModal(false);
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono truncate"
                >
                  {f.path}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMergeModal(false)}
              className="w-full py-1 text-xs text-light-muted dark:text-dark-muted"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
