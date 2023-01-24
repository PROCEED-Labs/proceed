package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.text.TextUtils;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DeviceInfoWifi extends DeviceInfoTask {
    public DeviceInfoWifi() {
        deviceInfoName = "wifi";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray();
        JSONObject json = new JSONObject();
        ConnectivityManager connManager = (ConnectivityManager) req.getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = connManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
        if (networkInfo.isConnected()) {
            final WifiManager wifiManager = (WifiManager) req.getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            final WifiInfo connectionInfo = wifiManager.getConnectionInfo();
            if (connectionInfo != null && !TextUtils.isEmpty(connectionInfo.getSSID())) {
                json.put("ssid", connectionInfo.getSSID().replace("\"", ""));
                json.put("bssid", connectionInfo.getBSSID());
                int qualityDBm = connectionInfo.getRssi();
                json.put("signalLevel", qualityDBm);
                json.put("quality", WifiManager.calculateSignalLevel(qualityDBm, 100));
                json.put("connected", true);
            }
        }

        arr.put(json);

        resp.put(deviceInfoName, arr);
    }
}
