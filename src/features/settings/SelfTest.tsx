import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { encodeClipPayload, decodeClipPayload } from '../../lib/clipCodec';
import { sanitizePath } from '../../lib/parser/sanitizePath';
import { parseClipPayload } from '../../lib/parser/parseClip';
import { buildBookmarklet } from '../../lib/buildBookmarklet';
import { FIXTURE_WEB_TODO, FIXTURE_PYTHON_API, FIXTURE_ASCII_TREE_PROJECT } from '../../dev/fixtures';

export interface TestResult {
  id: number;
  title: string;
  passed: boolean;
  details: string;
}

export const SelfTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runAllTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Codec (F0 uncompressed and F1 compressed)
    try {
      const samplePayload = FIXTURE_WEB_TODO;

      // 1a. Test F0 (force uncompressed)
      const encodedF0 = await encodeClipPayload(samplePayload, true);
      if (!encodedF0.startsWith('F0.')) throw new Error('بادئة الترميز غير المضغوط F0. غير صحيحة');
      const decodedF0 = await decodeClipPayload(encodedF0);
      if (decodedF0.blocks.length !== samplePayload.blocks.length) throw new Error('عدم تطابق كتل F0');

      // 1b. Test F1 (gzip)
      const encodedF1 = await encodeClipPayload(samplePayload, false);
      const decodedF1 = await decodeClipPayload(encodedF1);
      if (decodedF1.blocks.length !== samplePayload.blocks.length) throw new Error('عدم تطابق كتل F1');

      testResults.push({
        id: 1,
        title: 'فحص ترميز وفك ضغط الحمولة (F0 و F1)',
        passed: true,
        details: `نجح الترميز والفك المتماثل لـ F0 (${encodedF0.length} حرف) و F1 (${encodedF1.length} حرف)`
      });
    } catch (err: any) {
      testResults.push({
        id: 1,
        title: 'فحص ترميز وفك ضغط الحمولة (F0 و F1)',
        passed: false,
        details: err.message
      });
    }

    // Test 2: Filename Parser on Fixtures
    try {
      const webResult = parseClipPayload(FIXTURE_WEB_TODO);
      const pyResult = parseClipPayload(FIXTURE_PYTHON_API);
      const treeResult = parseClipPayload(FIXTURE_ASCII_TREE_PROJECT);

      const hasPackage = webResult.files.some(f => f.path.includes('package.json'));
      const hasIndex = webResult.files.some(f => f.path.includes('index.html'));
      const hasPy = pyResult.files.some(f => f.path.includes('main.py'));
      const hasTreeFiles = treeResult.files.length >= 3;

      if (!hasPackage || !hasIndex || !hasPy || !hasTreeFiles) {
        throw new Error('فشل استنتاج بعض الأسماء من النماذج التجريبية');
      }

      testResults.push({
        id: 2,
        title: 'فحص استنتاج أسماء الملفات وشجرة ASCII',
        passed: true,
        details: `تم استخراج ${webResult.files.length} ملفات ويب، و ${pyResult.files.length} ملفات بايثون، و ${treeResult.files.length} ملفات من شجرة ASCII بنجاح`
      });
    } catch (err: any) {
      testResults.push({
        id: 2,
        title: 'فحص استنتاج أسماء الملفات وشجرة ASCII',
        passed: false,
        details: err.message
      });
    }

    // Test 3: Sanitize Path against malicious paths
    try {
      const maliciousCases = [
        { in: '../../etc/passwd', expectNotContain: '..' },
        { in: 'C:\\Windows\\System32\\calc.exe', expectNotContain: 'C:' },
        { in: '//root//secret.txt', expectNotContain: '//' },
        { in: 'folder/../other/file.js', expectNotContain: '..' }
      ];

      for (const item of maliciousCases) {
        const cleaned = sanitizePath(item.in);
        if (cleaned.includes(item.expectNotContain) || cleaned.startsWith('/')) {
          throw new Error(`فشل تأمين المسار الخبيث: ${item.in} -> ${cleaned}`);
        }
      }

      testResults.push({
        id: 3,
        title: 'فحص أمان المسارات (Sanitize Path)',
        passed: true,
        details: 'تم منع جميع محاولات اجتياز المسارات (../../) والرموز المطلقة و C:\\ بنجاح'
      });
    } catch (err: any) {
      testResults.push({
        id: 3,
        title: 'فحص أمان المسارات (Sanitize Path)',
        passed: false,
        details: err.message
      });
    }

    // Test 4: Bookmarklet generation & single-line validation
    try {
      const { bookmarkletUrl } = buildBookmarklet('https://fitna.test/app');
      if (!bookmarkletUrl.startsWith('javascript:')) {
        throw new Error('كود الإشارة لا يبدأ بـ javascript:');
      }
      if (bookmarkletUrl.includes('\n') || bookmarkletUrl.includes('\r')) {
        throw new Error('كود الإشارة يحتوي على فواصل أسطر ولم يأتِ في سطر واحد');
      }

      const rawCode = decodeURIComponent(bookmarkletUrl.replace(/^javascript:/, ''));
      if (!rawCode.includes('fitna-clipper')) {
        throw new Error('كود الإشارة المفكوك غير صالح أو تنقصه معرّفات الفطنة');
      }

      testResults.push({
        id: 4,
        title: 'فحص توليد كود الإشارة المرجعية (Bookmarklet)',
        passed: true,
        details: 'تم التحقق أن الكود سطر واحد صالح يبدأ بـ javascript: ويفك إلى جافاسكربت سليم'
      });
    } catch (err: any) {
      testResults.push({
        id: 4,
        title: 'فحص توليد كود الإشارة المرجعية (Bookmarklet)',
        passed: false,
        details: err.message
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const allPassed = results.length > 0 && results.every(r => r.passed);

  return (
    <div className="p-3.5 space-y-3.5 text-light-text dark:text-dark-text text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-sm">الاختبار الذاتي التلقائي (Self-Test)</h3>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'جارٍ الفحص...' : 'تشغيل الفحوصات'}</span>
        </button>
      </div>

      <p className="text-[11px] text-light-muted dark:text-dark-muted leading-relaxed">
        يتحقق هذا الفحص التلقائي من توافق عقود الترميز (F0/F1) مع سحّاب الكود، وصحة محلل الأسماء والشجرة، وأمان المسارات، وصلاحية كود الـ Bookmarklet.
      </p>

      {/* Results Container */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.id}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                r.passed
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-300'
              }`}
            >
              {r.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 space-y-0.5 min-w-0">
                <div className="font-bold text-xs">{r.title}</div>
                <div className="text-[11px] opacity-90 leading-normal">{r.details}</div>
              </div>
            </div>
          ))}

          {allPassed && (
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>جميع الفحوصات الأربعة اجتازت الاختبار بنجاح تام! ✅</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
