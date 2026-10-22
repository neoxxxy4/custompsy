package com.provodnik.app

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView

    private val isOfflineMode: Boolean
        get() = BuildConfig.FLAVOR == "offline"

    private val startUrl: String
        get() = if (isOfflineMode) {
            "https://neoxxxy-4.ru/?mode=offline"
        } else {
            "https://neoxxxy-4.ru/"
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView(this).apply {
            clearCache(true)
            clearHistory()
            clearFormData()
        }
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                // все внутренние ссылки neoxxxy-4.ru оставляем в WebView
                if (url.host == "neoxxxy-4.ru") return false
                // внешние ссылки — в браузер
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                Log.e("ProvodnikWeb", "Error loading ${request?.url}: ${error?.description} (${error?.errorCode})")
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                Log.d("ProvodnikJS", "${message.message()} -- ${message.sourceId()}:${message.lineNumber()}")
                return true
            }
        }

        setContentView(webView)
        webView.addJavascriptInterface(IconBridge(this), "ProvodnikNative")
        val url = "$startUrl&__v=${System.currentTimeMillis()}"
        webView.loadUrl(url)
    }

    class IconBridge(private val activity: Activity) {
        private val variants = mapOf(
            "moon" to "com.provodnik.app.MainActivity",
            "moon-blue" to "com.provodnik.app.iconMoonBlue",
            "moon-cyan" to "com.provodnik.app.iconMoonCyan",
            "moon-pink" to "com.provodnik.app.iconMoonPink",
        )

        @JavascriptInterface
        fun setIcon(id: String) {
            val target = variants[id] ?: return
            val pm = activity.packageManager
            val pkg = activity.packageName
            activity.runOnUiThread {
                // сначала включаем нужный алиас, затем выключаем остальные
                pm.setComponentEnabledSetting(
                    ComponentName(pkg, target),
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                )
                variants.values.filter { it != target }.forEach { cls ->
                    pm.setComponentEnabledSetting(
                        ComponentName(pkg, cls),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                    )
                }
                Log.d("ProvodnikIcon", "icon switched to $id")
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
