import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Lock, Globe, GitBranch, FolderGit2, Loader2, AlertCircle } from 'lucide-react';
import { listUserRepos, listRepoBranches, GitHubRepo } from '../../lib/githubApi';

interface ExistingRepoPickerProps {
  token: string;
  onRepoSelected: (repo: GitHubRepo, branch: string, subFolder: string, commitMsg: string) => void;
  onBack: () => void;
}

export const ExistingRepoPicker: React.FC<ExistingRepoPickerProps> = ({
  token,
  onRepoSelected,
  onBack
}) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [subFolder, setSubFolder] = useState('');
  const [commitMessage, setCommitMessage] = useState('تحديث ملفات المشروع عبر الفطنة');
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const list = await listUserRepos(token, 1, 50);
        setRepos(list);
      } catch (err: any) {
        setErrorMsg(err.message || 'فشل جلب قائمة المستودعات من GitHub');
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [token]);

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch || 'main');
    setIsLoadingBranches(true);
    try {
      const branchList = await listRepoBranches(token, repo.full_name.split('/')[0], repo.name);
      setBranches(branchList.map(b => b.name));
    } catch {
      setBranches([repo.default_branch || 'main']);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    onRepoSelected(selectedRepo, selectedBranch, subFolder.trim(), commitMessage);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">اختر مستودعاً قائماً من حسابك</h3>
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

      {!selectedRepo ? (
        <div className="space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-light-muted dark:text-dark-muted" />
            <input
              type="text"
              placeholder="بحث في مستودعاتك..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Repos list */}
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {isLoadingRepos ? (
              <div className="text-center py-6 text-light-muted dark:text-dark-muted flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>جارٍ جلب المستودعات...</span>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-center py-6 text-light-muted dark:text-dark-muted">
                لم يتم العثور على أي مستودعات مطابقة.
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  className="p-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:border-blue-500/60 cursor-pointer transition flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span dir="ltr">{repo.name}</span>
                      {repo.private ? (
                        <span title="مستودع خاص"><Lock className="w-3 h-3 text-amber-500" /></span>
                      ) : (
                        <span title="مستودع عام"><Globe className="w-3 h-3 text-emerald-500" /></span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-[10px] text-light-muted dark:text-dark-muted truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-light-muted dark:text-dark-muted shrink-0">
                    {repo.default_branch}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-2.5 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border flex items-center justify-between">
            <div>
              <span className="text-[11px] text-light-muted dark:text-dark-muted block">المستودع المحدد:</span>
              <strong className="text-xs font-mono" dir="ltr">{selectedRepo.full_name}</strong>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRepo(null)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              تغيير
            </button>
          </div>

          {/* Branch Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
              الفرع (Branch):
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Subfolder */}
          <div>
            <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
              مجلد فرعي هدف (اختياري - اتركه فارغاً للرفع في الجذر):
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="packages/client أو my-app"
              value={subFolder}
              onChange={(e) => setSubFolder(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
          </div>

          {/* Commit Message */}
          <div>
            <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
              رسالة الـ Commit:
            </label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 min-h-[40px] shadow-sm"
          >
            <span>بدء الرفع إلى هذا المستودع</span>
          </button>
        </form>
      )}
    </div>
  );
};
