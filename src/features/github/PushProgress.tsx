import React from 'react';
import { Loader2, GitCommit, GitBranch, UploadCloud } from 'lucide-react';

interface PushProgressProps {
  percentage: number;
  message: string;
  currentFile?: string;
  completedFiles: number;
  totalFiles: number;
  stage: string;
}

export const PushProgress: React.FC<PushProgressProps> = ({
  percentage,
  message,
  currentFile,
  completedFiles,
  totalFiles,
  stage
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 text-center text-light-text dark:text-dark-text text-xs">
      <div className="p-3.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 relative">
        <UploadCloud className="w-8 h-8 animate-pulse" />
        <Loader2 className="w-4 h-4 animate-spin absolute -bottom-1 -right-1 text-blue-600" />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-sm">جارٍ رفع المشروع إلى GitHub...</h3>
        <p className="text-light-muted dark:text-dark-muted text-xs leading-relaxed">
          {message}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs space-y-1">
        <div className="h-2 w-full bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-light-muted dark:text-dark-muted px-0.5">
          <span>{percentage}%</span>
          <span>{completedFiles} / {totalFiles} ملف</span>
        </div>
      </div>

      {currentFile && (
        <div className="px-3 py-1.5 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border font-mono text-[11px] text-light-muted dark:text-dark-muted truncate max-w-xs" dir="ltr">
          {currentFile}
        </div>
      )}
    </div>
  );
};
