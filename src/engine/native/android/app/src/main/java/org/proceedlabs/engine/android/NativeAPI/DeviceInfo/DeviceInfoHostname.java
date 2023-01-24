package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.provider.Settings;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoHostname extends DeviceInfoTask {
    public DeviceInfoHostname() {
        deviceInfoName = "hostname";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        resp.put(deviceInfoName, Settings.Global.getString(req.getContext().getContentResolver(), Settings.Global.DEVICE_NAME));
    }
}
