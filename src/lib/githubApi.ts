export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
  updated_at: string;
}

export interface PushFile {
  path: string;
  content: string;
}

export interface PushProgressCallback {
  (progress: {
    stage: 'blobs' | 'tree' | 'commit' | 'push' | 'done';
    percentage: number;
    currentFile?: string;
    completedFiles: number;
    totalFiles: number;
    message: string;
  }): void;
}

// Translate GitHub API errors to clear Arabic explanations
export function translateGitHubError(status: number, message: string): string {
  if (status === 401) {
    return 'رمز الوصول (PAT) غير صالح أو منتهي الصلاحية. يرجى التأكد من نسخه بشكل صحيح.';
  }
  if (status === 403) {
    if (message.includes('rate limit')) {
      return 'تم تجاوز حد الطلبات المسموح به من GitHub مؤقتاً. يرجى الانتظار دقيقة والمحاولة مجدداً.';
    }
    return 'لا تملك الصلاحية الكافية لهذا المستودع. تأكد أن التوكن يحمل صلاحية "repo".';
  }
  if (status === 404) {
    return 'المستودع أو الفرع غير موجود، أو أن التوكن لا يملك صلاحية الوصول إليه.';
  }
  if (status === 422) {
    if (message.includes('already exists') || message.includes('name already exists')) {
      return 'اسم المستودع موجود بالفعل في حسابك على GitHub. اختر اسماً آخر.';
    }
    return 'البيانات المدخلة غير صالحة لـ GitHub (رمز 422): ' + message;
  }
  return `حدث خطأ في الاتصال بـ GitHub (${status}): ${message}`;
}

async function fetchGitHub(endpoint: string, token: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('https://') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(options.headers || {})
  };

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const resp = await fetch(url, { ...options, headers });
      if (!resp.ok) {
        // Handle rate limit retry
        if ((resp.status === 403 || resp.status === 429) && attempt < maxAttempts) {
          const retryAfter = resp.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * attempt;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const errData = await resp.json().catch(() => ({ message: resp.statusText }));
        const arabicMsg = translateGitHubError(resp.status, errData.message || '');
        const error = new Error(arabicMsg);
        (error as any).status = resp.status;
        throw error;
      }
      return await resp.json();
    } catch (err: any) {
      if (attempt >= maxAttempts || err.status) {
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Verifies PAT and fetches authenticated user profile
 */
export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  return await fetchGitHub('/user', token);
}

/**
 * Lists user repositories with sorting by recently updated
 */
export async function listUserRepos(token: string, page = 1, perPage = 30): Promise<GitHubRepo[]> {
  return await fetchGitHub(`/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator`, token);
}

/**
 * Creates a brand new GitHub repository
 */
export async function createGitHubRepo(
  token: string,
  data: {
    name: string;
    description?: string;
    private: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }
): Promise<GitHubRepo> {
  return await fetchGitHub('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      auto_init: data.auto_init !== undefined ? data.auto_init : true
    })
  });
}

/**
 * Lists branches of a repository
 */
export async function listRepoBranches(token: string, owner: string, repo: string): Promise<{ name: string }[]> {
  return await fetchGitHub(`/repos/${owner}/${repo}/branches`, token);
}

/**
 * Enables GitHub Pages on the given branch
 */
export async function enableGitHubPages(token: string, owner: string, repo: string, branch = 'main'): Promise<any> {
  return await fetchGitHub(`/repos/${owner}/${repo}/pages`, token, {
    method: 'POST',
    body: JSON.stringify({
      source: {
        branch,
        path: '/'
      }
    })
  });
}

/**
 * Concurrency helper: processes items with maximum N parallel workers
 */
async function parallelLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIdx = index++;
      results[currentIdx] = await fn(items[currentIdx], currentIdx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Pushes project files via Git Data API in a single atomic commit
 */
export async function pushProjectToGitHub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: PushFile[],
  commitMessage = 'تحديث كود المشروع عبر الفطنة',
  subFolder = '',
  onProgress?: PushProgressCallback
): Promise<{ commitSha: string; commitUrl: string }> {
  const totalFiles = files.length;
  if (totalFiles === 0) {
    throw new Error('لا توجد ملفات محددة للرفع.');
  }

  // File size validation: Warn on >50MB, reject on >100MB
  for (const f of files) {
    const size = new Blob([f.content]).size;
    if (size > 100 * 1024 * 1024) {
      throw new Error(`الملف ${f.path} يتجاوز 100MB، وهو الحد الأقصى المسموح به في GitHub.`);
    }
  }

  // 1. Create Blobs in parallel (concurrency limit = 5)
  onProgress?.({
    stage: 'blobs',
    percentage: 10,
    completedFiles: 0,
    totalFiles,
    message: 'جارٍ رفع كتل الملفات (Blobs)...'
  });

  let completedBlobs = 0;
  const treeItems = await parallelLimit(files, 5, async (file) => {
    // UTF-8 blob creation
    const blobData = await fetchGitHub(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({
        content: file.content,
        encoding: 'utf-8'
      })
    });

    completedBlobs++;
    const targetPath = subFolder
      ? `${subFolder.replace(/^\/+|\/+$/g, '')}/${file.path}`
      : file.path;

    onProgress?.({
      stage: 'blobs',
      percentage: Math.round(10 + (completedBlobs / totalFiles) * 60),
      currentFile: file.path,
      completedFiles: completedBlobs,
      totalFiles,
      message: `تم رفع ${file.path}`
    });

    return {
      path: targetPath,
      mode: '100644', // standard file mode
      type: 'blob',
      sha: blobData.sha
    };
  });

  // 2. Get latest commit SHA on the target branch
  onProgress?.({
    stage: 'tree',
    percentage: 75,
    completedFiles: totalFiles,
    totalFiles,
    message: 'جارٍ قراءة رأس الفرع الحالي...'
  });

  let baseTreeSha: string | undefined;
  let parentCommitSha: string | undefined;

  try {
    const refData = await fetchGitHub(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    parentCommitSha = refData.object.sha;
    const commitData = await fetchGitHub(`/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, token);
    baseTreeSha = commitData.tree.sha;
  } catch {
    // Branch might be new or empty
  }

  // 3. Create Git Tree
  onProgress?.({
    stage: 'tree',
    percentage: 85,
    completedFiles: totalFiles,
    totalFiles,
    message: 'جارٍ بناء شجرة التغييرات (Git Tree)...'
  });

  const treePayload: any = { tree: treeItems };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  }

  const newTree = await fetchGitHub(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify(treePayload)
  });

  // 4. Create Commit
  onProgress?.({
    stage: 'commit',
    percentage: 92,
    completedFiles: totalFiles,
    totalFiles,
    message: 'جارٍ تسجيل الـ Commit...'
  });

  const commitPayload: any = {
    message: commitMessage,
    tree: newTree.sha,
    parents: parentCommitSha ? [parentCommitSha] : []
  };

  const newCommit = await fetchGitHub(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify(commitPayload)
  });

  // 5. Update Reference (or create ref if branch did not exist)
  onProgress?.({
    stage: 'push',
    percentage: 98,
    completedFiles: totalFiles,
    totalFiles,
    message: 'جارٍ تحديث الفرع على GitHub...'
  });

  try {
    await fetchGitHub(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false
      })
    });
  } catch {
    // If ref not found, create it
    await fetchGitHub(`/repos/${owner}/${repo}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommit.sha
      })
    });
  }

  onProgress?.({
    stage: 'done',
    percentage: 100,
    completedFiles: totalFiles,
    totalFiles,
    message: 'اكتمل الرفع بنجاح!'
  });

  return {
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`
  };
}
