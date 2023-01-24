package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.provider.Settings;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoId extends DeviceInfoTask {
    public DeviceInfoId() {
        deviceInfoName = "id";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        resp.put(deviceInfoName, Settings.Secure.getString(req.getContext().getContentResolver(), Settings.Secure.ANDROID_ID));
    }
}
