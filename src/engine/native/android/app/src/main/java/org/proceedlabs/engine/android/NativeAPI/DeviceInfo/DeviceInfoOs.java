package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.os.Build;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoOs extends DeviceInfoTask {
    public DeviceInfoOs() {
        deviceInfoName = "os";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("platform", "linux");
        json.put("distro", "android");
        json.put("release", Build.VERSION.SDK_INT);

        resp.put(deviceInfoName, json);
    }
}
