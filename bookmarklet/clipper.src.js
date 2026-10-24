/**
 * مشروع "الفطنة" (Al-Fitna) — سحّاب الكود (Bookmarklet)
 * ملف: bookmarklet/clipper.src.js
 * كود JavaScript عادي (ES2019) بدون أي مكتبات أو استدعاءات خارجية أو طلبات شبكة نهائياً.
 */
(function() {
  'use strict';

  // معرّف العنصر على الصفحة لمنع التكرار
  const OVERLAY_ID = '__al_fitna_clipper_overlay__';

  // إغلاق أي نافذة سابقة إن وجدت
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
  }

  // رابط الفطنة الهدف (يُستبدل تلقائياً بواسطة buildBookmarklet)
  const FITNA_URL = '__FITNA_URL__';

  // قواعد مخصصة للمواقع (يمكن إضافة محددات خاصة مستقبلاً إذا رغب المستخدم)
  // مثال: { host: 'custom-ai.com', preSelector: '.code-snippet', titleSelector: '.snippet-title' }
  const SITE_RULES = [];

  // كلمات واجهة الاستخدام الشائعة لحذفها من رؤوس الكتل
  const UI_WORDS = [
    'copy', 'download', 'run', 'edit', 'code', 'snippet', 'preview',
    'نسخ', 'تحميل', 'تشغيل', 'تعديل', 'كود', 'معاينة'
  ];

  function cleanHeader(text) {
    if (!text) return '';
    let cleaned = text.trim();
    for (const w of UI_WORDS) {
      const reg = new RegExp('(^|\\s|\\b)' + w + '(\\b|\\s|$)', 'gi');
      cleaned = cleaned.replace(reg, ' ');
    }
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  // استخراج النص المساعد (hint) من العناصر السابقة للكتلة
  function extractHint(elem) {
    const hints = [];
    let curr = elem;
    let levels = 0;

    while (curr && levels < 5) {
      let prev = curr.previousElementSibling;
      while (prev) {
        if (prev.matches('pre') || prev.querySelector('pre')) {
          break; // توقف عند كتلة الكود السابقة
        }
        const text = prev.innerText || prev.textContent || '';
        if (text.trim()) {
          hints.unshift(text.trim());
        }
        prev = prev.previousElementSibling;
      }
      curr = curr.parentElement;
      levels++;
    }

    const combined = hints.join(' ').replace(/\s+/g, ' ').trim();
    return combined.slice(-240); // آخر 240 حرفاً قبل الكتلة
  }

  // استخراج لغة البرمجة من كلاسات العنصر
  function detectLang(elem, preElem) {
    const classNames = (elem.className + ' ' + (preElem ? preElem.className : '')).toLowerCase();
    const match = classNames.match(/(?:language-|lang-)([a-z0-9_+#-]+)/i);
    if (match) return match[1];

    // فحص النص الأول إن كان اسم لغة شائع
    const firstLine = (elem.textContent || '').trim().split('\n')[0].toLowerCase();
    const knownLangs = ['python', 'javascript', 'typescript', 'html', 'css', 'json', 'bash', 'sh', 'sql', 'kotlin', 'java', 'c', 'cpp', 'rust', 'go', 'php', 'yaml', 'xml', 'dockerfile'];
    for (const l of knownLangs) {
      if (firstLine === l || firstLine === '```' + l) return l;
    }
    return '';
  }

  // جمع كتل الكود من الصفحة
  let preElements = Array.from(document.querySelectorAll('pre'));
  if (preElements.length === 0) {
    // محاولة البحث عن عناصر code طويلة (أكثر من 3 أسطر)
    const codeCandidates = Array.from(document.querySelectorAll('code'));
    preElements = codeCandidates.filter(c => {
      const lines = (c.textContent || '').split('\n');
      return lines.length > 3 && !c.closest('pre');
    });
  }

  // النص المحدد حالياً إن وجد (حتى 200,000 حرف)
  let selectedText = null;
  const selection = window.getSelection ? window.getSelection().toString() : '';
  if (selection && selection.trim().length > 0) {
    selectedText = selection.slice(0, 200000);
  }

  const rawBlocks = [];
  let totalBytes = 0;
  const MAX_BLOCKS = 500;
  const MAX_BLOCK_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
  let limitExceededMsg = null;

  for (let idx = 0; idx < preElements.length && idx < MAX_BLOCKS; idx++) {
    const pre = preElements[idx];
    const codeElem = pre.tagName.toLowerCase() === 'code' ? pre : (pre.querySelector('code') || pre);

    // استخراج الكود مع إزالة السطر الفارغ الأخير فقط
    let code = (codeElem.innerText || codeElem.textContent || '');
    if (code.endsWith('\n')) {
      code = code.slice(0, -1);
    }

    if (!code.trim()) continue;

    const blockSize = new Blob([code]).size;
    if (blockSize > MAX_BLOCK_SIZE) {
      limitExceededMsg = 'تم تجاوز الحد الأقصى لحجم الكتلة الواحدة (2MB)';
      continue;
    }

    totalBytes += blockSize;
    if (totalBytes > MAX_TOTAL_SIZE) {
      limitExceededMsg = 'تم تجاوز الحد الأقصى لإجمالي حجم الكود (20MB)';
      break;
    }

    // استخراج العنوان أو شريط الأدوات السابق
    let headerText = '';
    const parent = pre.parentElement;
    if (parent) {
      const prev = pre.previousElementSibling;
      if (prev) {
        headerText = cleanHeader(prev.innerText || prev.textContent || '');
      } else if (parent.firstElementChild !== pre) {
        headerText = cleanHeader(parent.firstElementChild.innerText || parent.firstElementChild.textContent || '');
      }
    }

    const lang = detectLang(codeElem, pre);
    const hint = extractHint(pre);

    rawBlocks.push({
      i: rawBlocks.length + 1,
      lang: lang || '',
      hdr: headerText,
      hint: hint,
      code: code
    });
  }

  // إنشاء واجهة Shadow DOM
  const container = document.createElement('div');
  container.id = OVERLAY_ID;
  container.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;direction:rtl;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  const shadow = container.attachShadow({ mode: 'open' });

  // التحقق من الثيم المفضل للمستخدم
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = isDark ? {
    bg: '#18181b',
    surface: '#27272a',
    text: '#fafafa',
    muted: '#a1a1aa',
    border: '#3f3f46',
    primary: '#3b82f6',
    btnBg: '#3f3f46',
    btnText: '#ffffff'
  } : {
    bg: '#ffffff',
    surface: '#f4f4f5',
    text: '#09090b',
    muted: '#71717a',
    border: '#e4e4e7',
    primary: '#2563eb',
    btnBg: '#e4e4e7',
    btnText: '#09090b'
  };

  // حالة التحديد
  const selectedIndices = new Set(rawBlocks.map(b => b.i));

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' ب';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ك.ب';
    return (bytes / (1024 * 1024)).toFixed(1) + ' م.ب';
  }

  function getFirstLinePreview(code) {
    const first = code.trim().split('\n')[0] || '';
    return first.slice(0, 60);
  }

  function getSuggestedName(b) {
    if (b.hdr && (b.hdr.includes('.') || b.hdr.includes('/'))) return b.hdr;
    const match = b.hint.match(/([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/);
    if (match) return match[1];
    return b.lang ? `ملف.${b.lang}` : `كتلة ${b.i}`;
  }

  // بناء الحمولة
  function buildPayload() {
    const filteredBlocks = rawBlocks.filter(b => selectedIndices.has(b.i));
    return {
      app: 'fitna-clipper',
      v: 1,
      t: Date.now(),
      src: {
        url: window.location.href,
        title: document.title || 'محادثة ذكاء اصطناعي',
        host: window.location.hostname
      },
      sel: selectedText,
      blocks: filteredBlocks
    };
  }

  // ترميز Base64Url على دفعات (0x8000)
  function bytesToBase64Url(bytes) {
    let binary = '';
    const len = bytes.length;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      let chunkStr = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkStr += String.fromCharCode(chunk[j]);
      }
      binary += chunkStr;
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ضغط وترميز الحمولة
  async function encodePayload(payload) {
    const jsonStr = JSON.stringify(payload);
    const utf8Bytes = new TextEncoder().encode(jsonStr);

    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new Response(new Blob([utf8Bytes]).stream().pipeThrough(new CompressionStream('gzip')));
        const buffer = await stream.arrayBuffer();
        const compressed = new Uint8Array(buffer);
        return 'F1.' + bytesToBase64Url(compressed);
      } catch (e) {
        // بديل غير مضغوط
      }
    }
    return 'F0.' + bytesToBase64Url(utf8Bytes);
  }

  // نسخ للنص في الحافظة مع بديل execCommand
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) resolve();
        else reject(new Error('execCommand copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  // تنزيل ملف JSON
  function downloadJsonFile(payload) {
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitna-import-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function render() {
    const payload = buildPayload();
    const blocksCount = payload.blocks.length;
    let selectedBytes = 0;
    for (const b of payload.blocks) {
      selectedBytes += new Blob([b.code]).size;
    }

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sheet {
          background: ${theme.bg};
          color: ${theme.text};
          border-top: 1px solid ${theme.border};
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          font-size: 13px;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid ${theme.border};
          background: ${theme.surface};
          border-radius: 16px 16px 0 0;
        }
        .title {
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge {
          background: ${theme.primary};
          color: #fff;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: ${theme.muted};
          padding: 4px 8px;
          border-radius: 6px;
        }
        .close-btn:hover { color: ${theme.text}; }
        .content {
          padding: 12px 16px;
          overflow-y: auto;
          flex: 1;
        }
        .summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          color: ${theme.muted};
          font-size: 12px;
        }
        .tools {
          display: flex;
          gap: 6px;
        }
        .link-btn {
          background: none;
          border: none;
          color: ${theme.primary};
          cursor: pointer;
          font-size: 11px;
          text-decoration: underline;
        }
        .block-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 240px;
          overflow-y: auto;
        }
        .block-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: ${theme.surface};
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid ${theme.border};
          cursor: pointer;
        }
        .block-info {
          flex: 1;
          min-width: 0;
        }
        .block-title {
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .block-preview {
          color: ${theme.muted};
          font-family: monospace;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
          direction: ltr;
          text-align: left;
        }
        .empty-msg {
          text-align: center;
          padding: 24px 12px;
          color: ${theme.muted};
          line-height: 1.6;
        }
        .footer {
          padding: 12px 16px;
          border-top: 1px solid ${theme.border};
          background: ${theme.surface};
          display: flex;
          gap: 8px;
        }
        .btn {
          flex: 1;
          padding: 10px 8px;
          border-radius: 8px;
          border: 1px solid ${theme.border};
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: opacity 0.15s;
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-primary {
          background: ${theme.primary};
          color: #fff;
          border: none;
        }
        .btn-secondary {
          background: ${theme.btnBg};
          color: ${theme.btnText};
        }
        .status-bar {
          font-size: 11px;
          padding: 4px 16px;
          text-align: center;
          color: ${theme.muted};
          background: ${theme.bg};
        }
      </style>
      <div class="sheet">
        <div class="header">
          <div class="title">
            <span>🔖 سحّاب الفطنة</span>
            <span class="badge">${rawBlocks.length} كتلة</span>
          </div>
          <button class="close-btn" id="closeBtn" title="إغلاق">✕</button>
        </div>

        <div class="content">
          ${rawBlocks.length === 0 ? `
            <div class="empty-msg">
              <p>لم أجد كتل كود في هذه الصفحة.</p>
              <p style="font-size: 11px; margin-top: 6px;">جرّب تحديد نص الكود في المحادثة ثم اضغط الإشارة مجدداً.</p>
            </div>
          ` : `
            <div class="summary">
              <span>المحدد: ${blocksCount} من ${rawBlocks.length} (${formatSize(selectedBytes)})</span>
              <div class="tools">
                <button class="link-btn" id="selectAllBtn">تحديد الكل</button>
                <span>•</span>
                <button class="link-btn" id="deselectAllBtn">إلغاء الكل</button>
              </div>
            </div>

            <div class="block-list">
              ${rawBlocks.map(b => `
                <label class="block-item">
                  <input type="checkbox" data-idx="${b.i}" ${selectedIndices.has(b.i) ? 'checked' : ''} style="margin-top: 3px;" />
                  <div class="block-info">
                    <div class="block-title">
                      ${b.lang ? `<span style="color:${theme.primary}; font-family:monospace;">[${b.lang}]</span> ` : ''}
                      ${getSuggestedName(b)}
                    </div>
                    <div class="block-preview">${getFirstLinePreview(b.code)}</div>
                  </div>
                </label>
              `).join('')}
            </div>
          `}
        </div>

        <div id="statusMsg" class="status-bar" style="display:none;"></div>

        <div class="footer">
          <button class="btn btn-primary" id="sendBtn" ${blocksCount === 0 ? 'disabled' : ''}>
            📤 إرسال للفطنة
          </button>
          <button class="btn btn-secondary" id="copyBtn" ${blocksCount === 0 ? 'disabled' : ''}>
            📋 نسخ
          </button>
          <button class="btn btn-secondary" id="fileBtn" ${blocksCount === 0 ? 'disabled' : ''}>
            💾 ملف
          </button>
        </div>
      </div>
    `;

    // ربط الأحداث
    shadow.getElementById('closeBtn').onclick = () => container.remove();

    const selectAllBtn = shadow.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.onclick = () => {
        rawBlocks.forEach(b => selectedIndices.add(b.i));
        render();
      };
    }

    const deselectAllBtn = shadow.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
      deselectAllBtn.onclick = () => {
        selectedIndices.clear();
        render();
      };
    }

    shadow.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (e.target.checked) selectedIndices.add(idx);
        else selectedIndices.delete(idx);
        render();
      };
    });

    const statusEl = shadow.getElementById('statusMsg');
    function setStatus(msg, isErr) {
      statusEl.style.display = 'block';
      statusEl.style.color = isErr ? '#ef4444' : theme.muted;
      statusEl.textContent = msg;
    }

    // زر 1: إرسال للفطنة عبر الـ Hash
    const sendBtn = shadow.getElementById('sendBtn');
    if (sendBtn) {
      sendBtn.onclick = async () => {
        sendBtn.disabled = true;
        sendBtn.textContent = 'جارٍ الترميز...';
        try {
          const p = buildPayload();
          const encoded = await encodePayload(p);
          if (encoded.length > 800000) {
            setStatus('الحجم كبير جداً للرابط (أكبر من 800KB). استعمل النسخ أو الملف.', true);
            sendBtn.disabled = true;
            return;
          }
          const targetUrl = FITNA_URL.replace(/#.*$/, '') + '#fitna=' + encoded;
          window.open(targetUrl, '_blank');
          setTimeout(() => container.remove(), 1000);
        } catch (err) {
          setStatus('تعذر تجهيز الرابط: ' + err.message, true);
          sendBtn.disabled = false;
          sendBtn.textContent = '📤 إرسال للفطنة';
        }
      };
    }

    // زر 2: نسخ للحافظة (FITNA-IMPORT:...)
    const copyBtn = shadow.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        copyBtn.disabled = true;
        copyBtn.textContent = 'جارٍ النسخ...';
        try {
          const p = buildPayload();
          const encoded = await encodePayload(p);
          const clipText = 'FITNA-IMPORT:' + encoded;
          await copyTextToClipboard(clipText);
          copyBtn.textContent = '✅ تم النسخ!';
          setStatus('تم نسخ الحمولة للحافظة! يمكنك لصقها الآن في تطبيق الفطنة.', false);
          setTimeout(() => {
            copyBtn.disabled = false;
            copyBtn.textContent = '📋 نسخ';
          }, 3000);
        } catch (err) {
          setStatus('فشل النسخ التلقائي. استعمل خيار حفظ الملف.', true);
          copyBtn.disabled = false;
          copyBtn.textContent = '📋 نسخ';
        }
      };
    }

    // زر 3: تنزيل ملف JSON
    const fileBtn = shadow.getElementById('fileBtn');
    if (fileBtn) {
      fileBtn.onclick = () => {
        try {
          const p = buildPayload();
          downloadJsonFile(p);
          setStatus('تم بدء تحميل ملف الاستيراد JSON بنجاح.', false);
        } catch (err) {
          setStatus('تعذر تحميل الملف: ' + err.message, true);
        }
      };
    }
  }

  document.body.appendChild(container);
  render();
})();
