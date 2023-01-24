package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.graphics.Point;
import android.hardware.display.DisplayManager;
import android.view.Display;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/*
 * return the view-port size of all connected Displays
 * */
public class DeviceInfoDisplay extends DeviceInfoTask {
    public DeviceInfoDisplay() {
        deviceInfoName = "display";
    }

    public static Display[] getDisplays(NativeRequest req) {
        DisplayManager dm = (DisplayManager) req.getContext().getSystemService(req.getContext().DISPLAY_SERVICE);
        return dm.getDisplays();
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray();

        Display[] displays = getDisplays(req);

        for (Display d : displays) {
            Point p = new Point();
            d.getSize(p);   //not necessaraly the phsical resolution, but ViewPort size of the app
            JSONObject json = new JSONObject();
            json.put("currentResX", p.x);
            json.put("currentResY", p.y);

            arr.put(json);
        }
        resp.put(deviceInfoName, arr);
    }
}
