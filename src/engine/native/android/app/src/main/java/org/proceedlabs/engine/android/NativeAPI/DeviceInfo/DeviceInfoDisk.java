package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.os.StatFs;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;

public class DeviceInfoDisk extends DeviceInfoTask {
    public DeviceInfoDisk() {
        deviceInfoName = "disk";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray();
        File[] externalStorageFiles = ContextCompat.getExternalFilesDirs(req.getContext(), null);
        for (File f : externalStorageFiles) {
            try {
                arr.put(getInfo(getRootPath(f)));
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
        resp.put(deviceInfoName, arr);
    }

    private String getRootPath(File file) {
        {
            if (file == null)
                return null;
            String path = file.getAbsolutePath();
            return path.split("/Android/data/")[0];
        }
    }

    private JSONObject getInfo(String rootPath) throws JSONException {
        Log.i("rootPath: ", rootPath);
        StatFs statFs = new StatFs(rootPath);
        JSONObject diskJSON = new JSONObject();
        diskJSON.put("type", "SSD");
        diskJSON.put("total", statFs.getTotalBytes());
        diskJSON.put("free", statFs.getAvailableBytes());
        diskJSON.put("used", statFs.getTotalBytes() - statFs.getFreeBytes());

        /*
         * activate this, to identify removeable falsh momory
         * this can be very useful, to avoid loosing data, when SD-card is removed
         *
         * */
        //diskJSON.put("removable",!rootPath.contains("emulated"));

        return diskJSON;
    }
}
