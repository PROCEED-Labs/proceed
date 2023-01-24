package org.proceedlabs.engine.android;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.nfc.NfcAdapter;
import android.nfc.NfcManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import org.proceedlabs.engine.android.NativeAPI.Capabilities.CapabilityNFCScanner;
import org.proceedlabs.engine.android.NativeAPI.Capabilities.CapabilityTakeUserPhoto;
import org.proceedlabs.engine.android.NativeAPI.Discovery;
import org.proceedlabs.engine.android.Utility.NotificationService;
import org.proceedlabs.engine.android.Utility.PermissionManager;

import org.json.JSONException;

public class MainActivity extends AppCompatActivity {
    private final static String[] additionalPermissions = {
            //add permissions here
    };
    final int PERMISSIONS_REQUEST_CODE = 788;
    public WebViewController wvInstance;
    public IPCController ipcController;
    private NfcAdapter adapter;
    private PowerManager.WakeLock wakeLock;
    public static boolean appHasFocus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        //request Background Activity
        PermissionManager.checkAndRequestBatteryOptimizations(this);

        // load NativeAPI and required permissions
        ipcController = new IPCController(this);
        ipcController.addPermission(additionalPermissions);

        //start WebView, AFTER Permissions granted/DENIED -> all capabilities can be shown
        if (!ipcController.checkPermissions(this))
            ActivityCompat.requestPermissions(this, ipcController.requiredPermissions, PERMISSIONS_REQUEST_CODE);
        else
            startWebView();

        NotificationService.startService(this);

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PROCEED::background");
        wakeLock.acquire();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        startWebView();
    }

    //start WebView,
    private void startWebView() {
        wvInstance = new WebViewController(this);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        new Thread(() -> {
            if (requestCode == CapabilityTakeUserPhoto.PICTURE_REQUEST_CODE)
                CapabilityTakeUserPhoto.onTakePictureCallback(resultCode, data);
        }).start();
        super.onActivityResult(requestCode, resultCode, data);
    }

    //NFC Tag handling
    @Override
    public void onNewIntent(Intent intent) {
        //react to NFC Intents
        try {
            if (intent.getParcelableExtra(NfcAdapter.EXTRA_TAG) != null)
                if (!CapabilityNFCScanner.tryToHandleNFCTag(intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)))
                    return; //nfc Tag event, wich doesnt need to be handled
        } catch (JSONException e) {
            e.printStackTrace();
        } catch (NullPointerException nex) {
            nex.printStackTrace();
        }
        //react to notification Intents
        String action = intent.getAction();
        if (action != null) {
            if (action.equals(NotificationService.BRING_APP_TO_FRONT_ACTION)) {
                Log.i("onNewIntent", "opened by Notification");
                return;
            } else if (action.equals(NotificationService.SHUT_APP_DOWN_ACTION)) {
                shutdownEngine();
                Log.i("onNewIntent", "closed by Notification");
                finish();
                System.exit(0);
                return;
            }
        }
        //pass on other Intents
        super.onNewIntent(intent);
    }


    // https://proandroiddev.com/working-with-nfc-tags-on-android-c1e5af47a3db
    @Override
    protected void onResume() {
        super.onResume();
        appHasFocus = true;
        NfcManager nfcManager = (NfcManager) getSystemService(Context.NFC_SERVICE);

        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent nfcPendingIntent = PendingIntent.getActivity(this, 0, intent, 0);

        adapter = nfcManager.getDefaultAdapter();
        if (adapter != null)
            adapter.enableForegroundDispatch(this, nfcPendingIntent, null, null);
    }

    @Override
    protected void onPause() {
        appHasFocus = false;
        Log.i("main", "app onPause");
        if (adapter != null) {
            adapter.disableForegroundDispatch(this);
        }
        if (isFinishing()) {
            Log.i("main", "app isFinishing");
            shutdownEngine();
        }
        super.onPause();

    }

    @Override
    protected void onDestroy() {
        shutdownEngine();
        Log.i("main", "app closing");
        super.onDestroy();
    }

    private void shutdownEngine() {
        Log.i("main", "shutdownEngine");
        Discovery.unpublish(null);
        NotificationService.stopSercice(this);
        wakeLock.release();
    }
}