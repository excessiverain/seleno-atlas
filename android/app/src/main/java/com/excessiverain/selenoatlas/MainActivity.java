package com.excessiverain.selenoatlas;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * 极简 WebView 壳：加载打包在 assets 内的单文件月球地图。
 *
 * - 完全离线，不申请网络权限；
 * - 触控/双指缩放由页面自身的 Three.js 逻辑处理；
 * - http(s) 外链交给系统浏览器，避免把用户困在 WebView；
 * - 返回键：WebView 有历史时后退，否则退出应用。
 */
public class MainActivity extends Activity {

    private static final String TAG = "LunarAtlas";
    private static final String APP_URL = "file:///android_asset/moon_atlas.html";
    private static final String PREFS = "seleno_atlas";
    private static final String KEY_SEARCH_HISTORY = "search_history";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.addJavascriptInterface(new NativeBridge(), "LunarApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUri(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUri(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "Page finished: " + url);
                // 页面内的 target=_blank / window.open 外链，统一走系统浏览器
                view.evaluateJavascript(
                    "(function(){" +
                    "if(window.__lunarNativeLinks)return;" +
                    "window.__lunarNativeLinks=true;" +
                    "document.addEventListener('click',function(e){" +
                    "var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;" +
                    "if(!a)return;" +
                    "var h=a.getAttribute('href')||'';" +
                    "if(/^https?:/i.test(h)){e.preventDefault();e.stopPropagation();LunarApp.openExternal(h);}" +
                    "},true);" +
                    "})();", null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.d(TAG, msg.message() + " @ " + msg.sourceId() + ":" + msg.lineNumber());
                return true;
            }
        });

        setContentView(webView);
        webView.loadUrl(APP_URL);
    }

    private boolean handleUri(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception e) {
                Log.w(TAG, "No browser available for " + uri, e);
            }
            return true;
        }
        return false;
    }

    /** 仅暴露受限的外链打开和搜索历史存储能力给页面。 */
    private class NativeBridge {
        @JavascriptInterface
        public void openExternal(final String url) {
            runOnUiThread(() -> {
                if (url != null && (url.startsWith("https://") || url.startsWith("http://"))) {
                    handleUri(Uri.parse(url));
                }
            });
        }

        @JavascriptInterface
        public String loadSearchHistory() {
            return getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_SEARCH_HISTORY, "[]");
        }

        @JavascriptInterface
        public void saveSearchHistory(final String json) {
            if (json == null || json.length() > 65536) return;
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_SEARCH_HISTORY, json)
                .apply();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
