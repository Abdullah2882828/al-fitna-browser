import React from 'react';
import { File, Folder, AlertCircle, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { ProjectFile } from '../../store/projects';

interface FileTreeProps {
  files: ProjectFile[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onDeleteFile: (index: number) => void;
  onAddNewFile: () => void;
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onToggleAll: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedIndex,
  onSelectIndex,
  onDeleteFile,
  onAddNewFile,
  selectedPaths,
  onTogglePath,
  onToggleAll
}) => {
  const allSelected = files.length > 0 && files.every(f => selectedPaths.has(f.path));

  const getConfidenceBadge = (confidence: ProjectFile['confidence']) => {
    switch (confidence) {
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="ثقة عالية في صحة اسم الملف" />;
      case 'medium':
        return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="ثقة متوسطة" />;
      case 'low':
        return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="ثقة منخفضة (اسم مولد تلقائياً)" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border text-xs">
      {/* Header with Tools */}
      <div className="flex items-center justify-between p-2 border-b border-light-border dark:border-dark-border bg-light-bg/60 dark:bg-dark-bg/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleAll}
            className="p-1 hover:text-blue-500 text-light-muted dark:text-dark-muted transition"
            title={allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <span className="font-semibold text-[11px] text-light-muted dark:text-dark-muted">
            الملفات ({selectedPaths.size}/{files.length})
          </span>
        </div>

        <button
          onClick={onAddNewFile}
          className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          title="إضافة ملف جديد"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {files.map((file, idx) => {
          const isSelected = selectedIndex === idx;
          const isChecked = selectedPaths.has(file.path);
          const warningsCount = file.warnings?.length || 0;

          return (
            <div
              key={file.path + '_' + idx}
              onClick={() => onSelectIndex(idx)}
              className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition select-none ${
                isSelected
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-light-text dark:text-dark-text'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation();
                    onTogglePath(file.path);
                  }}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />

                {getConfidenceBadge(file.confidence)}

                <span className="truncate font-mono text-[11px] direction-ltr text-left" dir="ltr">
                  {file.path}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {warningsCount > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] text-amber-500 bg-amber-500/10 px-1 rounded"
                    title={file.warnings?.join('\n')}
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>{warningsCount}</span>
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(idx);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:text-red-700 transition"
                  title="حذف الملف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
