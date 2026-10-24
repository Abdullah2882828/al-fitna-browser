import React, { useState, useSyncExternalStore } from 'react';
import { FloatingWindow } from './features/shell/FloatingWindow';
import { ClipperGuide } from './features/clipper/ClipperGuide';
import { ImportReceiver } from './features/clipper/ImportReceiver';
import { ReviewScreen } from './features/clipper/ReviewScreen';
import { BrowserHome } from './features/browser/BrowserHome';
import { AuthScreen } from './features/github/AuthScreen';
import { TargetChooser } from './features/github/TargetChooser';
import { NewRepoForm } from './features/github/NewRepoForm';
import { ExistingRepoPicker } from './features/github/ExistingRepoPicker';
import { PushProgress } from './features/github/PushProgress';
import { Done } from './features/github/Done';
import { PickFolder, UploadedFile } from './features/uploader/PickFolder';
import { PickZip } from './features/uploader/PickZip';
import { UploadPreview } from './features/uploader/UploadPreview';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SelfTest } from './features/settings/SelfTest';
import { ProjectLibrary } from './features/library/ProjectLibrary';
import { settingsStore } from './store/settings';
import { projectsStore } from './store/projects';
import { uiStore } from './store/ui';
import { SAMPLE_FIXTURES } from './dev/fixtures';
import { parseClipPayload } from './lib/parser/parseClip';
import { pushProjectToGitHub, GitHubUser, GitHubRepo } from './lib/githubApi';
import { Lock, Unlock, X } from 'lucide-react';

export const App: React.FC = () => {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
  const projects = useSyncExternalStore(projectsStore.subscribe, projectsStore.getSnapshot);
  const ui = useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);

  // Clipper Sub-states: 'guide' | 'receiver' | 'review'
  const [clipperSubView, setClipperSubView] = useState<'guide' | 'receiver' | 'review'>('guide');

  // GitHub Sub-states: 'auth' | 'target' | 'new-repo' | 'existing-repo' | 'pushing' | 'done'
  const [githubSubView, setGithubSubView] = useState<'auth' | 'target' | 'new-repo' | 'existing-repo' | 'pushing' | 'done'>('auth');
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubToken, setGithubToken] = useState<string>('');
  const [pushStatus, setPushStatus] = useState({
    percentage: 0,
    message: '',
    currentFile: '',
    completedFiles: 0,
    totalFiles: 0,
    stage: 'blobs'
  });
  const [doneResult, setDoneResult] = useState<{
    repoUrl: string;
    commitUrl: string;
    owner: string;
    repo: string;
    branch: string;
  } | null>(null);

  // Uploader Sub-states: 'folder' | 'zip' | 'preview'
  const [uploaderSubView, setUploaderSubView] = useState<'folder' | 'zip' | 'preview'>('folder');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedProjectName, setUploadedProjectName] = useState('');

  // PIN Unlock state
  const [pinUnlockInput, setPinUnlockInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Handler for loading sample fixtures
  const handleLoadExampleFixture = () => {
    const chosen = SAMPLE_FIXTURES[0].fixture;
    const parsed = parseClipPayload(chosen);
    projectsStore.setActiveProject({
      name: parsed.projectName,
      files: parsed.files.map(f => ({
        path: f.path,
        content: f.content,
        confidence: f.confidence,
        warnings: f.warnings
      })),
      sourceUrl: parsed.sourceUrl,
      sourceTitle: parsed.sourceTitle,
      sourceHost: parsed.sourceHost
    });
    setClipperSubView('review');
    uiStore.showToast('تم تحميل المشروع التجريبي لمراجعته!', 'success');
  };

  // Handler for GitHub Push
  const handleExecutePush = async (
    targetRepo: GitHubRepo,
    branch: string,
    subFolder = '',
    commitMsg = 'تحديث كود المشروع عبر الفطنة'
  ) => {
    if (!projects.activeProject || projects.activeProject.files.length === 0) {
      uiStore.showToast('لا توجد ملفات محددة للرفع', 'warn');
      return;
    }

    setGithubSubView('pushing');
    setPushStatus({
      percentage: 5,
      message: 'جارٍ بدء الاتصال بـ GitHub...',
      currentFile: '',
      completedFiles: 0,
      totalFiles: projects.activeProject.files.length,
      stage: 'blobs'
    });

    try {
      const owner = targetRepo.full_name.split('/')[0];
      const result = await pushProjectToGitHub(
        githubToken,
        owner,
        targetRepo.name,
        branch,
        projects.activeProject.files.map(f => ({ path: f.path, content: f.content })),
        commitMsg,
        subFolder,
        (progress) => {
          setPushStatus({
            percentage: progress.percentage,
            message: progress.message,
            currentFile: progress.currentFile || '',
            completedFiles: progress.completedFiles,
            totalFiles: progress.totalFiles,
            stage: progress.stage
          });
        }
      );

      setDoneResult({
        repoUrl: targetRepo.html_url,
        commitUrl: result.commitUrl,
        owner,
        repo: targetRepo.name,
        branch
      });
      setGithubSubView('done');
      settingsStore.log(`تم رفع ${projects.activeProject.files.length} ملفات إلى ${targetRepo.full_name}`, 'success');
    } catch (err: any) {
      uiStore.showToast(err.message || 'فشل رفع المشروع إلى GitHub', 'error');
      setGithubSubView('target');
    }
  };

  // Render view depending on navigation tab
  const renderCurrentTab = () => {
    switch (settings.activeTab) {
      case 'browser':
        return <BrowserHome />;

      case 'clipper':
        if (clipperSubView === 'review' && projects.activeProject) {
          return (
            <ReviewScreen
              onBackToImport={() => setClipperSubView('receiver')}
              onNavigateToGithub={() => {
                settingsStore.setActiveTab('github');
                setGithubSubView(githubToken ? 'target' : 'auth');
              }}
            />
          );
        }
        if (clipperSubView === 'receiver') {
          return (
            <ImportReceiver
              onProjectReady={(parsed) => {
                projectsStore.setActiveProject({
                  name: parsed.projectName,
                  files: parsed.files.map(f => ({
                    path: f.path,
                    content: f.content,
                    confidence: f.confidence,
                    warnings: f.warnings
                  })),
                  sourceUrl: parsed.sourceUrl,
                  sourceTitle: parsed.sourceTitle,
                  sourceHost: parsed.sourceHost
                });
                setClipperSubView('review');
              }}
              onBackToGuide={() => setClipperSubView('guide')}
            />
          );
        }
        return (
          <ClipperGuide
            onOpenManualImport={() => setClipperSubView('receiver')}
            onLoadExampleFixture={handleLoadExampleFixture}
          />
        );

      case 'github':
        if (!githubToken || githubSubView === 'auth') {
          return (
            <AuthScreen
              onAuthenticated={(user, token) => {
                setGithubUser(user);
                setGithubToken(token);
                setGithubSubView('target');
              }}
            />
          );
        }
        if (githubSubView === 'target') {
          return (
            <TargetChooser
              filesCount={projects.activeProject?.files.length || 0}
              onChooseNew={() => setGithubSubView('new-repo')}
              onChooseExisting={() => setGithubSubView('existing-repo')}
            />
          );
        }
        if (githubSubView === 'new-repo') {
          return (
            <NewRepoForm
              token={githubToken}
              defaultRepoName={projects.activeProject?.name || 'my-project'}
              onRepoCreated={(repo, branch, commitMsg) => {
                handleExecutePush(repo, branch, '', commitMsg);
              }}
              onBack={() => setGithubSubView('target')}
            />
          );
        }
        if (githubSubView === 'existing-repo') {
          return (
            <ExistingRepoPicker
              token={githubToken}
              onRepoSelected={(repo, branch, subFolder, commitMsg) => {
                handleExecutePush(repo, branch, subFolder, commitMsg);
              }}
              onBack={() => setGithubSubView('target')}
            />
          );
        }
        if (githubSubView === 'pushing') {
          return (
            <PushProgress
              percentage={pushStatus.percentage}
              message={pushStatus.message}
              currentFile={pushStatus.currentFile}
              completedFiles={pushStatus.completedFiles}
              totalFiles={pushStatus.totalFiles}
              stage={pushStatus.stage}
            />
          );
        }
        if (githubSubView === 'done' && doneResult) {
          return (
            <Done
              repoUrl={doneResult.repoUrl}
              commitUrl={doneResult.commitUrl}
              owner={doneResult.owner}
              repo={doneResult.repo}
              branch={doneResult.branch}
              token={githubToken}
              onReset={() => {
                setGithubSubView('target');
                settingsStore.setActiveTab('clipper');
                setClipperSubView('guide');
              }}
            />
          );
        }
        return null;

      case 'uploader':
        if (uploaderSubView === 'preview' && uploadedFiles.length > 0) {
          return (
            <UploadPreview
              files={uploadedFiles}
              projectName={uploadedProjectName}
              onProceedToGitHub={() => {
                settingsStore.setActiveTab('github');
                setGithubSubView(githubToken ? 'target' : 'auth');
              }}
              onBack={() => setUploaderSubView('folder')}
            />
          );
        }
        if (uploaderSubView === 'zip') {
          return (
            <PickZip
              onFilesExtracted={(files, name) => {
                setUploadedFiles(files);
                setUploadedProjectName(name);
                setUploaderSubView('preview');
              }}
              onSwitchToFolder={() => setUploaderSubView('folder')}
            />
          );
        }
        return (
          <PickFolder
            onFilesSelected={(files, name) => {
              setUploadedFiles(files);
              setUploadedProjectName(name);
              setUploaderSubView('preview');
            }}
            onSwitchToZip={() => setUploaderSubView('zip')}
          />
        );

      case 'settings':
        return <SettingsScreen onOpenSelfTest={() => uiStore.setSelfTestOpen(true)} />;

      default:
        return null;
    }
  };

  return (
    <>
      <FloatingWindow>
        {/* PIN Lock Barrier if locked */}
        {settings.isLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm">التطبيق مقفل برمز PIN</h3>
              <p className="text-[11px] text-light-muted dark:text-dark-muted">أدخل الرمز للمتابعة</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = settingsStore.unlock(pinUnlockInput);
                if (!ok) {
                  setPinError(true);
                  setPinUnlockInput('');
                }
              }}
              className="space-y-2 max-w-xs w-full"
            >
              <input
                type="password"
                maxLength={8}
                value={pinUnlockInput}
                onChange={(e) => {
                  setPinUnlockInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className={`w-full py-2 text-center tracking-widest text-base font-mono rounded-lg border bg-light-surface dark:bg-dark-surface focus:outline-none ${
                  pinError ? 'border-red-500' : 'border-light-border dark:border-dark-border'
                }`}
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                فتح القفل
              </button>
            </form>
          </div>
        ) : (
          renderCurrentTab()
        )}
      </FloatingWindow>

      {/* Project Library Modal */}
      {ui.isLibraryOpen && (
        <ProjectLibrary
          onSelectProject={() => {
            settingsStore.setActiveTab('clipper');
            setClipperSubView('review');
          }}
        />
      )}

      {/* Self Test Modal */}
      {ui.isSelfTestOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl shadow-2xl max-w-sm w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-light-border dark:border-dark-border">
              <span className="font-bold text-xs">الفحص الذاتي الشامل</span>
              <button
                onClick={() => uiStore.setSelfTestOpen(false)}
                className="p-1 rounded text-light-muted hover:text-light-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SelfTest />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-1.5 pointer-events-none max-w-xs">
        {ui.toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-3 py-2 rounded-lg text-xs shadow-lg backdrop-blur border text-white transition-all transform duration-200 animate-slideUp ${
              toast.type === 'success'
                ? 'bg-emerald-600/90 border-emerald-500/50'
                : toast.type === 'error'
                ? 'bg-red-600/90 border-red-500/50'
                : toast.type === 'warn'
                ? 'bg-amber-600/90 border-amber-500/50'
                : 'bg-zinc-800/90 border-zinc-700/50'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </>
  );
};
