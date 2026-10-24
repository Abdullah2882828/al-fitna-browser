package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

  private var filePathCallback: ValueCallback<Array<Uri>>? = null

  private val filePickerLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      if (result.resultCode == RESULT_OK) {
        val data = result.data
        val clipData = data?.clipData
        val uriList = mutableListOf<Uri>()

        if (clipData != null) {
          for (i in 0 until clipData.itemCount) {
            uriList.add(clipData.getItemAt(i).uri)
          }
        } else if (data?.data != null) {
          uriList.add(data.data!!)
        }

        filePathCallback?.onReceiveValue(
          if (uriList.isNotEmpty()) uriList.toTypedArray() else null
        )
      } else {
        filePathCallback?.onReceiveValue(null)
      }
      filePathCallback = null
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      MyApplicationTheme {
        Surface(
          modifier = Modifier
            .fillMaxSize()
            .testTag("fitna_container"),
          color = Color(0xFF0B0B0B)
        ) {
          FitnaWebViewContainer(
            onOpenFileChooser = { callback, intent ->
              filePathCallback = callback
              try {
                filePickerLauncher.launch(intent)
              } catch (e: Exception) {
                callback.onReceiveValue(null)
                filePathCallback = null
              }
            }
          )
        }
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun FitnaWebViewContainer(
  onOpenFileChooser: (ValueCallback<Array<Uri>>, Intent) -> Unit
) {
  val context = LocalContext.current
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var canGoBack by remember { mutableStateOf(false) }

  BackHandler(enabled = canGoBack) {
    webViewInstance?.let { webView ->
      if (webView.canGoBack()) {
        webView.goBack()
      }
    }
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .statusBarsPadding()
      .navigationBarsPadding()
      .imePadding()
      .background(Color(0xFF0B0B0B))
  ) {
    AndroidView(
      modifier = Modifier
        .fillMaxSize()
        .testTag("fitna_webview"),
      factory = { ctx ->
        WebView(ctx).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )
          setBackgroundColor(0xFF0B0B0B.toInt())

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          }

          webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
              view: WebView?,
              request: WebResourceRequest?
            ): Boolean {
              val url = request?.url?.toString() ?: return false
              // Keep local file asset loads inside WebView
              if (url.startsWith("file:///android_asset/")) {
                return false
              }
              // External links open in default Android browser (Chrome)
              try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                ctx.startActivity(intent)
                return true
              } catch (e: Exception) {
                return false
              }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              canGoBack = view?.canGoBack() ?: false
            }
          }

          webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
              webView: WebView?,
              filePathCallback: ValueCallback<Array<Uri>>?,
              fileChooserParams: FileChooserParams?
            ): Boolean {
              if (filePathCallback == null) return false
              val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "*/*"
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
              }
              onOpenFileChooser(filePathCallback, intent)
              return true
            }
          }

          loadUrl("file:///android_asset/web/index.html")
          webViewInstance = this
        }
      },
      update = { webView ->
        canGoBack = webView.canGoBack()
      }
    )
  }

  DisposableEffect(Unit) {
    onDispose {
      webViewInstance?.destroy()
      webViewInstance = null
    }
  }
}
