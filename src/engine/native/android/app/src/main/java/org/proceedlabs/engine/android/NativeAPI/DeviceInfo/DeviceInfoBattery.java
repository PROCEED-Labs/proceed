package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.os.BatteryManager;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;


/*
 * This class uses the BatteryManager to obtain information  about the battery status
 */
public class DeviceInfoBattery extends DeviceInfoTask {
    public DeviceInfoBattery() {
        deviceInfoName = "battery";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        BatteryManager bm = (BatteryManager) req.getContext().getSystemService(req.getContext().BATTERY_SERVICE);
        boolean isCharging = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS) == BatteryManager.BATTERY_STATUS_CHARGING;
        int maxCapacityMicrAH = (100 * bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER) / bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY));

        JSONObject json = new JSONObject();
        json.put("hasBattery", bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS) != BatteryManager.BATTERY_STATUS_UNKNOWN);
        json.put("percent", bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY));
        json.put("maxCapacity", maxCapacityMicrAH / 1000);
        json.put("isCharging", isCharging);
        json.put("acconnected", bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS) != BatteryManager.BATTERY_STATUS_DISCHARGING);

        /*
         * Use this line , to estimate the remaining battery time. inaccurate!
         */
        //json.put("timeremaining", !isCharging?(60*maxCapacityMicrAH/bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)):(0));

        resp.put(deviceInfoName, json);
    }
}
