import React from 'react';
import { PlusCircle, FolderGit2, ArrowRight } from 'lucide-react';

interface TargetChooserProps {
  onChooseNew: () => void;
  onChooseExisting: () => void;
  filesCount: number;
}

export const TargetChooser: React.FC<TargetChooserProps> = ({
  onChooseNew,
  onChooseExisting,
  filesCount
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-light-text dark:text-dark-text text-xs flex flex-col justify-center">
      <div className="text-center space-y-1">
        <h3 className="font-bold text-base tracking-tight">اختر وجهة الرفع إلى GitHub</h3>
        <p className="text-light-muted dark:text-dark-muted text-xs">
          لديك <strong className="text-blue-500 font-bold">{filesCount} ملفات</strong> جاهزة للرفع
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto w-full">
        {/* Choice 1: New Repository */}
        <button
          onClick={onChooseNew}
          className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-blue-500 hover:shadow-md transition text-right group flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              ➕ إنشاء مستودع جديد
            </div>
            <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
              إنشاء مستودع GitHub جديد وفارغ في حسابك، ورفع جميع ملفات المشروع إليه بـ Commit واحد منظم.
            </p>
          </div>
        </button>

        {/* Choice 2: Existing Repository */}
        <button
          onClick={onChooseExisting}
          className="p-4 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-emerald-500 hover:shadow-md transition text-right group flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="font-bold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              📁 الرفع إلى مستودع موجود
            </div>
            <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
              اختر مستودعاً قائماً من حسابك، وحدد الفرع والمجلد الهدف لإضافة الملفات أو استبدالها.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
