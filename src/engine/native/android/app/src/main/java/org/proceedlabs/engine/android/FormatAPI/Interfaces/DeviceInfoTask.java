package org.proceedlabs.engine.android.FormatAPI.Interfaces;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

public abstract class DeviceInfoTask extends Task {
    public String deviceInfoName = "";

    public abstract void handle(NativeRequest req, JSONObject res) throws JSONException;
}
