import { ClipPayloadV1 } from '../lib/clipCodec';

export const FIXTURE_WEB_TODO: ClipPayloadV1 = {
  app: 'fitna-clipper',
  v: 1,
  t: 1718000000000,
  src: {
    url: 'https://chat.deepseek.com/c/demo-web-todo',
    title: 'تطبيق مهام تفاعلي - DeepSeek',
    host: 'chat.deepseek.com'
  },
  sel: null,
  blocks: [
    {
      i: 1,
      lang: 'json',
      hdr: 'package.json',
      hint: 'أولاً، إعدادات المشروع وحزم التبعيات:',
      code: `{\n  "name": "al-fitna-todo",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite"\n  },\n  "dependencies": {\n    "lucide": "^0.300.0"\n  }\n}`
    },
    {
      i: 2,
      lang: 'html',
      hdr: 'index.html',
      hint: 'صفحة الويب الأساسية:',
      code: `<!-- filename: index.html -->\n<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8">\n  <title>قائمة المهام</title>\n  <link rel="stylesheet" href="./style.css">\n</head>\n<body>\n  <div id="app">\n    <h1>المهام اليومية</h1>\n    <div class="input-box">\n      <input type="text" id="taskInput" placeholder="أضف مهمة جديدة...">\n      <button id="addBtn">إضافة</button>\n    </div>\n    <ul id="list"></ul>\n  </div>\n  <script type="module" src="./main.js"></script>\n</body>\n</html>`
    },
    {
      i: 3,
      lang: 'css',
      hdr: 'style.css',
      hint: '### `style.css`\nتنسيق المظهر والبطاقات:',
      code: `body {\n  font-family: system-ui, sans-serif;\n  background: #f4f4f5;\n  margin: 0;\n  padding: 30px;\n}\n#app {\n  max-width: 440px;\n  margin: 0 auto;\n  background: #fff;\n  padding: 24px;\n  border-radius: 12px;\n  box-shadow: 0 4px 16px rgba(0,0,0,0.06);\n}\nh1 {\n  font-size: 1.25rem;\n  margin-bottom: 16px;\n}\n.input-box {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 16px;\n}\ninput {\n  flex: 1;\n  padding: 8px 12px;\n  border: 1px solid #e4e4e7;\n  border-radius: 6px;\n}\nbutton {\n  background: #2563eb;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n}`
    },
    {
      i: 4,
      lang: 'javascript',
      hdr: 'main.js',
      hint: 'منطق التحكم والتخزين المحلي:',
      code: `// filename: main.js\nconst input = document.getElementById('taskInput');\nconst btn = document.getElementById('addBtn');\nconst list = document.getElementById('list');\n\nlet tasks = JSON.parse(localStorage.getItem('tasks') || '[]');\n\nfunction render() {\n  list.innerHTML = '';\n  tasks.forEach((t, i) => {\n    const li = document.createElement('li');\n    li.textContent = t;\n    li.onclick = () => {\n      tasks.splice(i, 1);\n      save();\n    };\n    list.appendChild(li);\n  });\n}\n\nfunction save() {\n  localStorage.setItem('tasks', JSON.stringify(tasks));\n  render();\n}\n\nbtn.onclick = () => {\n  if (input.value.trim()) {\n    tasks.push(input.value.trim());\n    input.value = '';\n    save();\n  }\n};\n\nrender();`
    },
    {
      i: 5,
      lang: 'markdown',
      hdr: 'README.md',
      hint: 'ملف التوثيق والشرح:',
      code: `# مشروع المهام السريع\n\nتطبيق مهام ويب بسيط وخفيف تم إنشاؤه عبر محادثة الذكاء الاصطناعي ونقله بواسطة **الفطنة**.\n\n## التشغيل:\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``
    }
  ]
};

export const FIXTURE_PYTHON_API: ClipPayloadV1 = {
  app: 'fitna-clipper',
  v: 1,
  t: 1718100000000,
  src: {
    url: 'https://chatgpt.com/c/demo-fastapi',
    title: 'خادم بايثون ميكروسيرفس - ChatGPT',
    host: 'chatgpt.com'
  },
  sel: null,
  blocks: [
    {
      i: 1,
      lang: 'python',
      hdr: 'app/main.py',
      hint: 'ملف التطبيق الرئيسي في FastAPI:',
      code: `# file: app/main.py\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI(title="Fitna Demo API")\n\nclass Item(BaseModel):\n    id: int\n    title: str\n    completed: bool = False\n\ndb = []\n\n@app.get("/items")\ndef get_items():\n    return db\n\n@app.post("/items")\ndef create_item(item: Item):\n    db.append(item)\n    return item`
    },
    {
      i: 2,
      lang: 'text',
      hdr: 'requirements.txt',
      hint: 'المكتبات المطلوبة:',
      code: `fastapi>=0.100.0\nuvicorn>=0.23.0\npydantic>=2.0.0`
    },
    {
      i: 3,
      lang: 'dockerfile',
      hdr: 'Dockerfile',
      hint: 'حاوية دوكر للتشغيل:',
      code: `FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
    }
  ]
};

export const FIXTURE_ASCII_TREE_PROJECT: ClipPayloadV1 = {
  app: 'fitna-clipper',
  v: 1,
  t: 1718200000000,
  src: {
    url: 'https://claude.ai/chat/demo-tree',
    title: 'مشروع كامل مع شجرة ملفات - Claude',
    host: 'claude.ai'
  },
  sel: null,
  blocks: [
    {
      i: 1,
      lang: 'text',
      hdr: '',
      hint: 'إليك هيكل الملفات المقترح للمشروع:',
      code: `my-portfolio/\n├── index.html\n├── src/\n│   ├── app.js\n│   └── style.css\n└── data/\n    └── projects.json`
    },
    {
      i: 2,
      lang: 'html',
      hdr: '',
      hint: 'ملف الصفحة الرئيسية:',
      code: `<!DOCTYPE html>\n<html>\n<head><title>Portfolio</title></head>\n<body><h1>My Work</h1><script src="src/app.js"></script></body>\n</html>`
    },
    {
      i: 3,
      lang: 'javascript',
      hdr: '',
      hint: 'كود الجافاسكربت:',
      code: `fetch('data/projects.json').then(r => r.json()).then(console.log);`
    },
    {
      i: 4,
      lang: 'css',
      hdr: '',
      hint: 'ملف الأنماط:',
      code: `body { background: #fafafa; color: #111; margin: 0; }`
    },
    {
      i: 5,
      lang: 'json',
      hdr: '',
      hint: 'بيانات المشاريع:',
      code: `[\n  { "title": "Project 1", "stars": 42 },\n  { "title": "Project 2", "stars": 88 }\n]`
    }
  ]
};

export const SAMPLE_FIXTURES = [
  { name: 'تطبيق ويب كامل (HTML/CSS/JS)', fixture: FIXTURE_WEB_TODO },
  { name: 'خادم بايثون API و Dockerfile', fixture: FIXTURE_PYTHON_API },
  { name: 'مشروع يعتمد على شجرة ASCII', fixture: FIXTURE_ASCII_TREE_PROJECT }
];
