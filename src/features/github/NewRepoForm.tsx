import React, { useState } from 'react';
import { ArrowLeft, GitBranch, Lock, Globe, FileCode, Check, AlertCircle } from 'lucide-react';
import { createGitHubRepo, GitHubRepo } from '../../lib/githubApi';

interface NewRepoFormProps {
  token: string;
  defaultRepoName: string;
  onRepoCreated: (repo: GitHubRepo, branch: string, commitMsg: string) => void;
  onBack: () => void;
}

export const NewRepoForm: React.FC<NewRepoFormProps> = ({
  token,
  defaultRepoName,
  onRepoCreated,
  onBack
}) => {
  // Normalize default name: replace spaces and invalid chars with dashes, lowercase
  const initialName = (defaultRepoName || 'my-project')
    .toLowerCase()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const [repoName, setRepoName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('إطلاق أولي للمشروع عبر الفطنة');
  const [gitignore, setGitignore] = useState('Node');
  const [license, setLicense] = useState('mit');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanName = repoName.trim().toLowerCase().replace(/[^\w.-]+/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanName) {
      setErrorMsg('يرجى إدخال اسم صالح للمستودع');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const repo = await createGitHubRepo(token, {
        name: cleanName,
        description: description.trim() || undefined,
        private: isPrivate,
        auto_init: true,
        gitignore_template: gitignore !== 'none' ? gitignore : undefined,
        license_template: license !== 'none' ? license : undefined
      });

      onRepoCreated(repo, branch || repo.default_branch || 'main', commitMessage);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء المستودع في GitHub.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">إنشاء مستودع جديد على GitHub</h3>
        <button
          onClick={onBack}
          className="text-xs text-light-muted dark:text-dark-muted hover:text-light-text flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>رجوع</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Repo Name */}
        <div>
          <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
            اسم المستودع:
          </label>
          <input
            type="text"
            dir="ltr"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="my-cool-project"
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          <span className="text-[10px] text-light-muted dark:text-dark-muted font-mono mt-0.5 block" dir="ltr">
            الاسم النهائي: {cleanName || '...'}
          </span>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
            الوصف (اختياري):
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="تطبيق ويب مبني عبر محادثة الذكاء الاصطناعي"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Public / Private Toggle */}
        <div>
          <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
            الخصوصية:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition ${
                !isPrivate
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-muted'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>عام (Public)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition ${
                isPrivate
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-muted'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>خاص (Private)</span>
            </button>
          </div>
        </div>

        {/* Branch & Commit Message */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
              اسم الفرع:
            </label>
            <input
              type="text"
              dir="ltr"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
              قالب .gitignore:
            </label>
            <select
              value={gitignore}
              onChange={(e) => setGitignore(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            >
              <option value="Node">Node.js</option>
              <option value="Python">Python</option>
              <option value="none">بدون (None)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
            رسالة الـ Commit:
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !cleanName}
          className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 min-h-[40px] shadow-sm"
        >
          <span>{isLoading ? 'جارٍ الإنشاء والرفع...' : 'إنشاء المستودع ورفع الملفات'}</span>
        </button>
      </form>
    </div>
  );
};
