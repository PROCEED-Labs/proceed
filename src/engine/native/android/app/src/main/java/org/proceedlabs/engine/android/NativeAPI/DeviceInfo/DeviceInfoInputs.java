package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.Manifest;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.Utility.PermissionManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoInputs extends DeviceInfoTask {
    public DeviceInfoInputs() {
        deviceInfoName = "inputs";
        //requiredPermissions = new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.RECORD_AUDIO}; //todo: not really needed, but you may want to ask for them in future
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray().put("Keyboard").put("Numpad");
        if (DeviceInfoDisplay.getDisplays(req).length > 0)
            arr.put("Touchscreen");
        if (PermissionManager.checkPermission(req.getContext(), Manifest.permission.CAMERA))
            arr.put("Camera");
        if (PermissionManager.checkPermission(req.getContext(), Manifest.permission.RECORD_AUDIO))
            arr.put("Microphone");
        resp.put(deviceInfoName, arr);
    }
}