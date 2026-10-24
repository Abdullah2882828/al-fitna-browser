# 📱 المرحلة الثانية (Phase 2): تحويل "الفطنة" إلى تطبيق أصلي (APK) ومحرك قراءة مباشر

توضح هذه الوثيقة خطة التطوير والانتقال بالمشروع إلى المرحلة الثانية لتحويله إلى تطبيق أندرويد مستقل (APK) كامل الصلاحيات، مع تشغيل محرك أصلي يقرأ صفحات الذكاء الاصطناعي مباشرة دون الحاجة لإشارة مرجعية (Bookmarklet).

---

## 🎯 1. أهداف المرحلة الثانية
1. **تطبيق أندرويد مستقل (APK):** بناء وتثبيت حزمة APK رسمية على الهاتف.
2. **محرك WebView أصلي (NATIVE Engine):** تجاوز حظر التضمين في المتصفحات العادية من خلال `Android WebView` الخاص بالتطبيق الأصلي، حيث يمتلك التطبيق الأصلي صلاحيات ضبط `User-Agent` والتحكم في ترويسات `Content-Security-Policy` وتجاوز قيود `X-Frame-Options` بأمان.
3. **قراءة المحادثات مباشرة:** تشغيل كود السحّاب تلقائياً عبر `webView.evaluateJavascript` عند كل استجابة جديدة من الذكاء الاصطناعي دون تدخل يدوي من المستخدم.
4. **أتمتة البناء (CI/CD):** بناء ملف الـ APK وتوقيعه تلقائياً عبر GitHub Actions عند كل إصدار جديد.

---

## 🛠️ 2. خطوات التكامل باستخدام Capacitor

### 1) تثبيت حزم Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "الفطنة" "com.aistudio.alfitna.app" --web-dir dist
```

### 2) إضافة منصة أندرويد
```bash
npx cap add android
```

### 3) ضبط ملف `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aistudio.alfitna.app',
  appName: 'الفطنة',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
```

---

## 🌐 3. محرك القراءة الأصلي (Native WebView Bridge)

في التطبيق الأصلي، يتم تفعيل محرك `NATIVE` في `src/store/engines.ts` وربطه مع كود كوتلن في `MainActivity.kt` عبر واجهة `JavascriptInterface`:

```kotlin
// Android Native Web Interface
class FitnaNativeBridge(private val onCodeReceived: (String) -> Unit) {
    @android.webkit.JavascriptInterface
    fun postPayload(payloadJson: String) {
        onCodeReceived(payloadJson)
    }
}

// في الـ WebView المخصص لصفحات الذكاء الاصطناعي:
val chatWebView = WebView(context).apply {
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    // تعديل User-Agent لتجاوز قيود التضمين
    settings.userAgentString = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
    
    addJavascriptInterface(FitnaNativeBridge { json ->
        // استقبال الكتل مباشرة من الصفحة
    }, "FitnaNativeBridge")
    
    webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)
            // حقن السحّاب تلقائياً
            val script = """
                (function() {
                    // كود فحص كتل pre وإرسالها لـ FitnaNativeBridge.postPayload(...)
                })();
            """
            view?.evaluateJavascript(script, null)
        }
    }
}
```

---

## ⚙️ 4. سير عمل GitHub Actions لبناء APK تلقائياً

أنشئ الملف `.github/workflows/android-build.yml` في مستودعك:

```yaml
name: Build Android Release APK

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 استنساخ المستودع
        uses: actions/checkout@v4

      - name: 🟢 إعداد Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: 📦 تثبيت الحزم وبناء تطبيق الويب
        run: |
          npm ci
          npm run build

      - name: ☕ إعداد بيئة Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: 17
          cache: 'gradle'

      - name: 🚀 بناء حزمة APK غير الموقعة
        run: |
          chmod +x gradlew
          ./gradlew assembleRelease --stacktrace

      - name: ✍️ توقيع حزمة الـ APK
        uses: r0adkll/sign-android-release@v1
        id: sign_app
        with:
          releaseDirectory: app/build/outputs/apk/release
          signingKey: ${{ secrets.ANDROID_SIGNING_KEY }}
          keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: 📤 رفع ملف الـ APK للإصدار
        uses: softprops/action-gh-release@v2
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: ${{ steps.sign_app.outputs.signedReleaseFile }}
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📈 خطة التنفيذ الموصى بها
1. تفعيل حزمة Capacitor في مشروع Vite الحالي.
2. تفعيل معالج `window.FitnaNativeBridge` في كود الاستيراد.
3. إضافة قنوات الإشعارات المحلية لتنبيه المستخدم عند اكتمال كتابة الكود من الذكاء الاصطناعي.
4. نشر الـ APK على متجر F-Droid أو GitHub Releases.
