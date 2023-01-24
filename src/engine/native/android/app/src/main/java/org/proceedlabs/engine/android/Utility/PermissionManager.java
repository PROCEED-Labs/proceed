package org.proceedlabs.engine.android.Utility;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import org.proceedlabs.engine.android.MainActivity;

public class PermissionManager {


    public static boolean checkPermission(MainActivity context, String... permissions) {
        boolean granted = true;
        for (String permission : permissions) {
            granted = granted && ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
        }
        return granted;
    }

    public static void checkAndRequestBatteryOptimizations(MainActivity context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return;
        }
        PowerManager powerManager = (PowerManager) context.getSystemService(context.POWER_SERVICE);
        if (!powerManager.isIgnoringBatteryOptimizations(context.getPackageName())) {

            Intent intent = new Intent();
            String packageName = context.getPackageName();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + packageName));
            context.startActivity(intent);
        }
    }
}
