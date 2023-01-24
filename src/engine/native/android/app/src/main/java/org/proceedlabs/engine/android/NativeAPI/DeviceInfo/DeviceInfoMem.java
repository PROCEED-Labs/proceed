package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.app.ActivityManager;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoMem extends DeviceInfoTask {
    public DeviceInfoMem() {
        deviceInfoName = "mem";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
        ActivityManager activityManager = (ActivityManager) req.getContext().getSystemService(req.getContext().ACTIVITY_SERVICE);
        activityManager.getMemoryInfo(mi);
        long availableMegs = mi.availMem;
        long totalMem = mi.totalMem;
        double inUseOf = 1 - (int) (mi.availMem / (double) totalMem * 10000.0) / 10000.0;

        JSONObject json = new JSONObject();
        json.put("total", totalMem);
        json.put("free", availableMegs);
        json.put("load", inUseOf);   //not all of this ist usable by the app https://stackoverflow.com/questions/3170691/how-to-get-current-memory-usage-in-android

        resp.put(deviceInfoName, json);
    }
}
