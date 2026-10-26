package com.provodnik.app

import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
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
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var pendingPermissionRequest: android.webkit.PermissionRequest? = null

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_RECORD_AUDIO) {
            val req = pendingPermissionRequest
            pendingPermissionRequest = null
            if (req != null) {
                if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                    req.grant(arrayOf(android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                } else {
                    req.deny()
                }
            }
        }
    }

    companion object {
        private const val REQ_RECORD_AUDIO = 42
    }

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

            // getUserMedia (голосовой ввод) из WebView: выдаём аудио, если у приложения есть RECORD_AUDIO
            override fun onPermissionRequest(request: android.webkit.PermissionRequest) {
                val granted = checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                val wantsAudio = request.resources.contains(android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (granted && wantsAudio) {
                    request.grant(arrayOf(android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                } else if (wantsAudio) {
                    // прав ещё нет — запоминаем запрос и спрашиваем у пользователя
                    pendingPermissionRequest = request
                    requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), REQ_RECORD_AUDIO)
                } else {
                    request.deny()
                }
            }
        }

        // спросим доступ к микрофону заранее, чтобы голосовой ввод не спотыкался
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), REQ_RECORD_AUDIO)
        }

        setContentView(webView)
        webView.addJavascriptInterface(IconBridge(this), "ProvodnikNative")
        val url = "$startUrl&__v=${System.currentTimeMillis()}"
        webView.loadUrl(url)
        checkUpdate()
    }

    // автообновление: сверяем versionCode с сервером, предлагаем скачать и поставить
    private fun checkUpdate() {
        if (isOfflineMode) return // тестовая сборка не обновляется
        thread {
            try {
                val conn = URL("https://neoxxxy-4.ru/app/version.json").openConnection() as HttpURLConnection
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                val body = conn.inputStream.bufferedReader().readText()
                conn.disconnect()
                val code = Regex("\"versionCode\"\\s*:\\s*(\\d+)").find(body)?.groupValues?.get(1)?.toIntOrNull() ?: return@thread
                val apkUrl = Regex("\"url\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                    ?: "https://neoxxxy-4.ru/app/latest.apk"
                if (code > BuildConfig.VERSION_CODE) {
                    runOnUiThread { promptUpdate(apkUrl) }
                }
            } catch (e: Exception) {
                Log.d("ProvodnikUpdate", "check failed: $e")
            }
        }
    }

    private fun promptUpdate(apkUrl: String) {
        if (isFinishing) return
        AlertDialog.Builder(this)
            .setTitle("Доступно обновление")
            .setMessage("Загрузить и установить новую версию Проводника?")
            .setPositiveButton("Обновить") { _, _ -> downloadAndInstall(apkUrl) }
            .setNegativeButton("Позже", null)
            .show()
    }

    private fun downloadAndInstall(apkUrl: String) {
        val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val req = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("Проводник — обновление")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(this, null, "update.apk")
        val id = dm.enqueue(req)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return
                try { unregisterReceiver(this) } catch (_: Exception) {}
                val uri = dm.getUriForDownloadedFile(id) ?: return
                val install = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(install)
            }
        }
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(receiver, filter)
        }
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
