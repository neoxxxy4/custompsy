package com.provodnik.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView

    private val startUrl: String
        get() = if (BuildConfig.FLAVOR == "offline") {
            "file:///android_asset/index.html"
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
        webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.clearCache(true)
        webView.clearHistory()
        webView.clearFormData()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (BuildConfig.FLAVOR == "offline") {
                    // в тестовом режиме всё работает локально из assets
                    if (url.scheme == "file") return false
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    return true
                }
                if (url.host == "neoxxxy-4.ru") return false
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                Log.d("ProvodnikJS", "${message.message()} -- ${message.sourceId()}:${message.lineNumber()}")
                return true
            }
        }

        setContentView(webView)
        val url = if (BuildConfig.FLAVOR == "offline") startUrl else "$startUrl?__v=${System.currentTimeMillis()}"
        webView.loadUrl(url)
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
