package org.proceedlabs.engine.android;

import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.Utility.Debugging.TestController;

import org.json.JSONException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

import static org.proceedlabs.engine.android.MainActivity.appHasFocus;

public class WebViewController {
    private static WebView wvInstance;
    private MainActivity instance;
    public FrameLayout ll;
    private ThreadPoolExecutor executor;


    public WebViewController(MainActivity main) {
        instance = main;
        initWebView();
    }


    private void initWebView() {
        if (wvInstance == null) {
            executor = (ThreadPoolExecutor) Executors.newFixedThreadPool(8);
            wvInstance = new WebView(instance) {
                // keep WebView Focused and Active, even if in Background
                // https://developers.google.com/web/updates/2018/07/page-lifecycle-api
                @Override
                public void dispatchWindowVisibilityChanged(int visibility) {
                    if (appHasFocus)
                        super.dispatchWindowVisibilityChanged(visibility);
                    else
                        super.dispatchWindowVisibilityChanged(VISIBLE);
                }

                @Override
                public boolean isFocused() {
                    if (appHasFocus)
                        return super.isFocused();
                    else
                        return true;
                }

                @Override
                protected void onFocusChanged(boolean focused, int direction, Rect previouslyFocusedRect) {
                    if (appHasFocus)
                        super.onFocusChanged(focused, direction, previouslyFocusedRect);
                    else
                        super.onFocusChanged(true, direction, previouslyFocusedRect);
                }
            };
            wvInstance.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

            wvInstance.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            wvInstance.getSettings().setJavaScriptEnabled(true);
            wvInstance.getSettings().setDomStorageEnabled(true);
            wvInstance.getSettings().setAllowFileAccess(true);
            wvInstance.getSettings().setAllowContentAccess(true);
            wvInstance.setWebContentsDebuggingEnabled(true);
            //wvInstance.setWebViewClient(new WebViewClient());
            wvInstance.getSettings().setAllowFileAccessFromFileURLs(true);
            wvInstance.getSettings().setAllowUniversalAccessFromFileURLs(true);
            wvInstance.getSettings().setPluginState(WebSettings.PluginState.ON);

            wvInstance.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    //Logging.log(consoleMessage);
                    return super.onConsoleMessage(consoleMessage);
                }

                @Override
                public void onProgressChanged(WebView view, int newProgress) {
                    if (newProgress == 100)
                        TestController.startTests(instance);     //todo: disable for production
                    super.onProgressChanged(view, newProgress);
                }
            });

            wvInstance.addJavascriptInterface(this, "Android");

            Map<String, String> header = new HashMap<>();
            header.put("Access-Control-Allow-Origin", "*");      //todo: check in necessearx

            wvInstance.loadUrl("file:///android_asset/index.html", header);
        }

        // display the WebView
        ll = instance.findViewById(R.id.layout);
        if (wvInstance.getParent() == null)
            ll.addView(wvInstance);
    }

    public void postToUniversal(String jsCode) {
        new Handler(Looper.getMainLooper()).post(() -> {
            wvInstance.evaluateJavascript(jsCode, null);
        });
    }

    // IPC Connection to WebView
    @JavascriptInterface
    public void postToNative(String message) {
        Runnable processIPC = () -> {
            try {
                instance.ipcController.receiveIPC(new NativeRequest(message, instance));
            } catch (JSONException e) {
                Log.i("IPC format Error", message);
                postToUniversal("IPC syntax error: " + message);
            }
        };
        //Process in Thread-Pool
        executor.execute(processIPC);
    }
}
