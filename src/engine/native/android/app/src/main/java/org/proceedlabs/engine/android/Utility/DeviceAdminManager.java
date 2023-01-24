package org.proceedlabs.engine.android.Utility;

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import org.proceedlabs.engine.android.MainActivity;

public class DeviceAdminManager extends DeviceAdminReceiver {
    private final static int REQUEST_CODE_ENABLE_ADMIN = 231;

    @Override
    public void onEnabled(Context context, Intent intent) {

    }

    @Override
    public void onDisabled(Context context, Intent intent) {

    }


    /*
    * you may want to call this method to request device Admin rights in future, to gain more control over the OS
    *
    * */
    public static void requestPermission(MainActivity context) {
        // Launch the activity to have the user enable our admin.
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, context.getComponentName());
        context.startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN);

        DevicePolicyManager mDPM = (DevicePolicyManager)context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName mAdminName = new ComponentName(context, DeviceAdminManager.class);

        if(mDPM != null &&mDPM.isAdminActive(mAdminName)) {
            // admin active
            return;
        }else {
            context.startActivity(new Intent().setComponent(new ComponentName("com.android.settings", "com.android.settings.DeviceAdminSettings")));
        }
    }
}
