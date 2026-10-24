import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, LogOut, ExternalLink, Shield, Loader2, AlertCircle } from 'lucide-react';
import { verifyGitHubToken, GitHubUser } from '../../lib/githubApi';
import { saveEncryptedToken, loadDecryptedToken, clearSavedToken, hasSavedToken } from '../../lib/secrets';
import { uiStore } from '../../store/ui';

interface AuthScreenProps {
  onAuthenticated: (user: GitHubUser, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<GitHubUser | null>(null);

  // Check saved token on mount
  useEffect(() => {
    const checkSaved = async () => {
      if (hasSavedToken()) {
        const decrypted = await loadDecryptedToken();
        if (decrypted) {
          try {
            setIsLoading(true);
            const user = await verifyGitHubToken(decrypted);
            setCurrentUser(user);
            onAuthenticated(user, decrypted);
          } catch {
            clearSavedToken();
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    checkSaved();
  }, [onAuthenticated]);

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await verifyGitHubToken(tokenInput.trim());
      await saveEncryptedToken(tokenInput.trim());
      setCurrentUser(user);
      uiStore.showToast(`مرحباً بك يا ${user.name || user.login}! تم الاتصال بـ GitHub`, 'success');
      onAuthenticated(user, tokenInput.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل التحقق من التوكن. تأكد من صحته وصلاحياته.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearSavedToken();
    setCurrentUser(null);
    setTokenInput('');
    uiStore.showToast('تم تسجيل الخروج ومسح التوكن المشفر', 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      {/* Current User Card if already authenticated */}
      {currentUser ? (
        <div className="p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-emerald-500/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.login}
                className="w-10 h-10 rounded-full border border-light-border dark:border-dark-border"
              />
              <div>
                <h3 className="font-bold text-xs">{currentUser.name || currentUser.login}</h3>
                <span className="font-mono text-[11px] text-light-muted dark:text-dark-muted">
                  @{currentUser.login}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition flex items-center gap-1 text-[11px]"
              title="تسجيل الخروج ومسح التوكن"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>

          <div className="flex gap-2 text-[11px] text-light-muted dark:text-dark-muted bg-light-bg dark:bg-dark-bg p-2 rounded-lg">
            <span>المستودعات العامة: <strong className="text-light-text dark:text-dark-text">{currentUser.public_repos}</strong></span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-800 text-white shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">الاتصال بحسابك في GitHub</h3>
              <p className="text-[11px] text-light-muted dark:text-dark-muted mt-0.5 leading-relaxed">
                يتصل تطبيق الفطنة مباشرة بـ GitHub API من متصفحك لرفع المشاريع، دون أي وسيط خارجي.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleVerifyAndSave} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-light-muted dark:text-dark-muted mb-1">
                رمز الوصول الشخصي (Personal Access Token):
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  dir="ltr"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute left-2.5 top-2.5 text-light-muted dark:text-dark-muted hover:text-light-text"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !tokenInput.trim()}
              className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 min-h-[38px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isLoading ? 'جارٍ التحقق من GitHub...' : 'تحقق وحفظ التوكن بأمان'}</span>
            </button>
          </form>

          {/* Guide for creating PAT */}
          <div className="pt-2 border-t border-light-border dark:border-dark-border text-[11px] space-y-1.5 text-light-muted dark:text-dark-muted">
            <div className="font-semibold text-light-text dark:text-dark-text flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>كيف تنشئ توكن في GitHub بدقيقة؟</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 leading-normal pr-1">
              <li>افتح صفحة التوكنات في GitHub (Tokens Classic).</li>
              <li>اختر صلاحية <strong>repo</strong> (لإنشاء ورفع الملفات).</li>
              <li>انسخ التوكن وألصقه هنا.</li>
            </ol>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Al-Fitna-App"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
            >
              <span>فتح صفحة إنشاء التوكن في GitHub مباشرة</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
