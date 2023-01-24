package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoOutputs extends DeviceInfoTask {
    public DeviceInfoOutputs() {
        deviceInfoName = "outputs";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray().put("Speaker");
        if (DeviceInfoDisplay.getDisplays(req).length > 0)
            arr.put("Screen");
        resp.put(deviceInfoName, arr);
    }
}
