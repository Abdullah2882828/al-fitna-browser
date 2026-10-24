import React, { useState } from 'react';
import { ArrowLeft, Cloud, FileCode, CheckSquare, Square, Trash2, ArrowRight } from 'lucide-react';
import { UploadedFile } from './PickFolder';
import { projectsStore } from '../../store/projects';

interface UploadPreviewProps {
  files: UploadedFile[];
  projectName: string;
  onProceedToGitHub: () => void;
  onBack: () => void;
}

export const UploadPreview: React.FC<UploadPreviewProps> = ({
  files: initialFiles,
  projectName: initialName,
  onProceedToGitHub,
  onBack
}) => {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [name, setName] = useState(initialName);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    new Set(initialFiles.map(f => f.path))
  );

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' ب';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ك.ب';
    return (bytes / (1024 * 1024)).toFixed(1) + ' م.ب';
  }

  const handleTogglePath = (p: string) => {
    const next = new Set(selectedPaths);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelectedPaths(next);
  };

  const handleToggleAll = () => {
    if (selectedPaths.size === files.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(files.map(f => f.path)));
    }
  };

  const handleDeleteFile = (idx: number) => {
    const removed = files[idx];
    const nextFiles = files.filter((_, i) => i !== idx);
    setFiles(nextFiles);
    const nextPaths = new Set(selectedPaths);
    nextPaths.delete(removed.path);
    setSelectedPaths(nextPaths);
  };

  const handleConfirmAndHandover = () => {
    const chosenFiles = files.filter(f => selectedPaths.has(f.path));
    // Load into active project state in store
    projectsStore.setActiveProject({
      name: name || 'مشروع مرفوع',
      files: chosenFiles.map(f => ({
        path: f.path,
        content: f.content,
        confidence: 'high'
      }))
    });
    onProceedToGitHub();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-light-text dark:text-dark-text text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="p-1 rounded text-light-muted hover:text-light-text transition"
            title="رجوع"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المشروع"
            className="font-bold text-xs bg-transparent border-b border-transparent hover:border-light-border focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate flex-1"
          />
        </div>
      </div>

      {/* Summary Banner */}
      <div className="px-3 py-2 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-light-muted dark:text-dark-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={handleToggleAll} className="hover:text-blue-500">
            {selectedPaths.size === files.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>
          <span>المحدد: {selectedPaths.size} من {files.length} ({formatSize(totalBytes)})</span>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map((file, idx) => {
          const isChecked = selectedPaths.has(file.path);

          return (
            <div
              key={file.path}
              className="p-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-blue-500/50 transition flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTogglePath(file.path)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-mono text-[11px] truncate direction-ltr text-left" dir="ltr">
                  {file.path}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-light-muted dark:text-dark-muted">
                  {formatSize(file.size)}
                </span>
                <button
                  onClick={() => handleDeleteFile(idx)}
                  className="text-red-500 hover:text-red-700 p-0.5"
                  title="استبعاد الملف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Handover to GitHub Button */}
      <div className="p-3 border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0">
        <button
          onClick={handleConfirmAndHandover}
          disabled={selectedPaths.size === 0}
          className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40 shadow-sm min-h-[40px]"
        >
          <Cloud className="w-4 h-4" />
          <span>المتابعة لرفع هذه الملفات إلى GitHub</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
