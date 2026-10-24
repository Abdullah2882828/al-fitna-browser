import React, { useState, useSyncExternalStore } from 'react';
import { Save, Download, Cloud, ShieldAlert, ArrowLeft, Check, Layers, AlertCircle } from 'lucide-react';
import { projectsStore, ProjectFile } from '../../store/projects';
import { settingsStore } from '../../store/settings';
import { uiStore } from '../../store/ui';
import { FileTree } from './FileTree';
import { Preview } from './Preview';
import { downloadProjectAsZip } from '../../lib/zip';
import { scanProjectFiles, SecretFinding } from '../../lib/secretScan';

interface ReviewScreenProps {
  onBackToImport: () => void;
  onNavigateToGithub: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  onBackToImport,
  onNavigateToGithub
}) => {
  const projects = useSyncExternalStore(projectsStore.subscribe, projectsStore.getSnapshot);
  const activeProject = projects.activeProject;

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    new Set(activeProject?.files.map(f => f.path) || [])
  );
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [detectedSecrets, setDetectedSecrets] = useState<SecretFinding[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTreeOnMobile, setShowTreeOnMobile] = useState(true);

  if (!activeProject || activeProject.files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500" />
        <p className="text-xs text-light-muted dark:text-dark-muted">لا يوجد مشروع قيد المراجعة حالياً.</p>
        <button
          onClick={onBackToImport}
          className="px-3 py-1.5 text-xs bg-zinc-800 text-white rounded-lg"
        >
          العودة للاستيراد
        </button>
      </div>
    );
  }

  const selectedIndex = Math.min(projects.selectedFileIndex, activeProject.files.length - 1);
  const currentFile = activeProject.files[selectedIndex] || activeProject.files[0];

  const handleTogglePath = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const handleToggleAll = () => {
    if (selectedPaths.size === activeProject.files.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(activeProject.files.map(f => f.path)));
    }
  };

  const handleAddNewFile = () => {
    const newFileName = `new_file_${activeProject.files.length + 1}.js`;
    projectsStore.addFile({
      path: newFileName,
      content: '// أضف كودك هنا\n',
      confidence: 'high'
    });
    setSelectedPaths(new Set([...selectedPaths, newFileName]));
  };

  const handleMergeWithFile = (targetPath: string) => {
    const targetFile = activeProject.files.find(f => f.path === targetPath);
    if (!targetFile) return;

    const mergedContent = currentFile.content + '\n\n// --- كود مدمج من ' + targetFile.path + ' ---\n\n' + targetFile.content;
    projectsStore.updateFile(selectedIndex, { content: mergedContent });
    uiStore.showToast(`تم دمج ${targetFile.path} في ${currentFile.path}`, 'success');
  };

  // Run Secret Scan before Git Push
  const handleInitiatePush = () => {
    const filesToPush = activeProject.files.filter(f => selectedPaths.has(f.path));
    const secrets = scanProjectFiles(filesToPush);
    if (secrets.length > 0) {
      setDetectedSecrets(secrets);
      setShowSecretModal(true);
      return;
    }
    onNavigateToGithub();
  };

  // Save to IndexedDB
  const handleSaveToDB = async () => {
    setIsSaving(true);
    try {
      await projectsStore.saveActiveProject();
      uiStore.showToast('تم حفظ المشروع في المكتبة بنجاح!', 'success');
    } catch {
      uiStore.showToast('فشل حفظ المشروع في قاعدة البيانات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Download ZIP
  const handleDownloadZip = async () => {
    const filesToPack = activeProject.files.filter(f => selectedPaths.has(f.path));
    if (filesToPack.length === 0) {
      uiStore.showToast('يرجى تحديد ملف واحد على الأقل للتحميل', 'warn');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadProjectAsZip(activeProject.name, filesToPack);
      uiStore.showToast('تم تنزيل أرشيف ZIP بنجاح!', 'success');
    } catch {
      uiStore.showToast('فشل إنشاء ملف ZIP', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-light-text dark:text-dark-text">
      {/* Top Review Bar: Project Name + Stats */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onBackToImport}
            className="p-1 rounded text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text transition"
            title="رجوع للاستيراد"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <input
            type="text"
            value={activeProject.name}
            onChange={(e) => projectsStore.updateProjectName(e.target.value)}
            placeholder="اسم المشروع"
            className="font-bold text-xs bg-transparent border-b border-transparent hover:border-light-border dark:hover:border-dark-border focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate flex-1"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTreeOnMobile(!showTreeOnMobile)}
            className="sm:hidden px-2 py-0.5 rounded border border-light-border dark:border-dark-border text-[11px]"
          >
            {showTreeOnMobile ? 'المحرر' : 'الملفات'}
          </button>
        </div>
      </div>

      {/* Main Body: File Tree + Preview Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Column */}
        <div className={`w-44 shrink-0 h-full ${showTreeOnMobile ? 'block' : 'hidden sm:block'}`}>
          <FileTree
            files={activeProject.files}
            selectedIndex={selectedIndex}
            onSelectIndex={(idx) => {
              projectsStore.setSelectedFileIndex(idx);
              setShowTreeOnMobile(false);
            }}
            onDeleteFile={(idx) => projectsStore.deleteFile(idx)}
            onAddNewFile={handleAddNewFile}
            selectedPaths={selectedPaths}
            onTogglePath={handleTogglePath}
            onToggleAll={handleToggleAll}
          />
        </div>

        {/* Editor Preview Column */}
        <div className={`flex-1 h-full overflow-hidden ${!showTreeOnMobile ? 'block' : 'hidden sm:block'}`}>
          {currentFile ? (
            <Preview
              file={currentFile}
              allFiles={activeProject.files}
              onUpdateFile={(up) => projectsStore.updateFile(selectedIndex, up)}
              onMergeWithFile={handleMergeWithFile}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-light-muted dark:text-dark-muted text-xs">
              اختر ملفاً لعرضه
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between p-2 border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0 text-xs gap-1.5">
        <button
          onClick={handleSaveToDB}
          disabled={isSaving}
          className="flex-1 py-1.5 px-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1 font-medium min-h-[36px]"
          title="حفظ في IndexedDB"
        >
          <Save className="w-3.5 h-3.5 text-blue-500" />
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ'}</span>
        </button>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="flex-1 py-1.5 px-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1 font-medium min-h-[36px]"
          title="تنزيل أرشيف ZIP"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isDownloading ? 'جارٍ الضغط...' : 'ZIP'}</span>
        </button>

        <button
          onClick={handleInitiatePush}
          className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1 font-semibold shadow-sm min-h-[36px]"
          title="رفع إلى GitHub"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>GitHub</span>
        </button>
      </div>

      {/* Secret Findings Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
          <div className="bg-light-surface dark:bg-dark-surface rounded-xl p-4 border border-amber-500/40 max-w-sm w-full space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-500">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm">تنبيه فاحص الأسرار (Secret Scan)</h4>
            </div>

            <p className="text-light-muted dark:text-dark-muted text-[11px] leading-relaxed">
              تم اكتشاف مفاتيح سرية أو ملفات حساسة في الكود! قد يؤدي رفعها إلى مستودع عام على GitHub لتسريب بياناتك:
            </p>

            <div className="max-h-40 overflow-y-auto space-y-1.5 bg-light-bg dark:bg-dark-bg p-2 rounded-lg border border-light-border dark:border-dark-border">
              {detectedSecrets.map((s, i) => (
                <div key={i} className="text-[11px] font-mono border-b border-light-border/40 dark:border-dark-border/40 pb-1">
                  <span className="text-amber-500 font-bold">{s.type}</span>: {s.filePath} (سطر {s.line})
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowSecretModal(false);
                  onNavigateToGithub();
                }}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                متابعة الرفع على مسؤوليتي
              </button>

              <button
                onClick={() => setShowSecretModal(false)}
                className="py-1.5 px-3 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-light-text dark:text-dark-text"
              >
                إلغاء ومراجعة الكود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
