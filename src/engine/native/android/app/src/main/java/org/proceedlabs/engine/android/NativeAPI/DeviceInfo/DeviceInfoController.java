package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;

/*
 * DOCUMENTATION:
 * See documentation of implemented values here
 * https://github.com/PROCEED-Labs/proceed/wiki/Machine-Information
 *
 * See documentation of node-implementation here
 * https://www.npmjs.com/package/systeminformation
 * */

/*
 * This class routes the requests to the requested function
 * it can return several properties within a single request: like read_device_info([["cpu","mem","disk"]])
 *
 * */

public class DeviceInfoController extends IPCTask {
    private HashMap<String, DeviceInfoTask> registeredDevInfoTasks = new HashMap<>();
    private DeviceInfoTask[] implementedTasks = {
            new DeviceInfoBattery(),
            new DeviceInfoCpu(),
            new DeviceInfoDisk(),
            new DeviceInfoDisplay(),
            new DeviceInfoHostname(),
            new DeviceInfoId(),
            new DeviceInfoInputs(),
            new DeviceInfoMem(),
            new DeviceInfoNetwork(),
            new DeviceInfoOs(),
            new DeviceInfoOutputs(),
            new DeviceInfoWifi(),
            // add IPCTask here
    };

    public DeviceInfoController() {
        taskNames = new String[]{"read_device_info"};
        selfHandlePermissions = true;   // self handle Permissions, in case they aren't granted

        //register subTaskts and collect Permissions
        for (DeviceInfoTask task : implementedTasks) {
            this.addPermission(task.requiredPermissions); //self requier permissions, needed by sub classes
            registeredDevInfoTasks.put(task.deviceInfoName, task);
        }
    }

    public void handle(NativeRequest req) throws JSONException {
        JSONObject responseJSON = new JSONObject();

        JSONArray requestedDeviceInfoNames = req.getArgs().getJSONArray(0);
        for (int i = 0; i < requestedDeviceInfoNames.length(); i++) {
            String singleDevInfoName = requestedDeviceInfoNames.getString(i);
            DeviceInfoTask devInfoTask = registeredDevInfoTasks.get(singleDevInfoName);

            /*
            * IGNORING UNKNOWN or UNAUTHORIZED device infos
            * consider throwing an error, in case a device info cant be handled
            * */
            if (devInfoTask == null) {
                //new NativeResponse(req).sendError("the requested DeviceInfo: " + singleDevInfoName + " - is not implemented or registrered!");
                continue;
            } else if (!devInfoTask.checkPermissions(req.getContext())) {
                //new NativeResponse(req).sendError("the requested DeviceInfo: " + singleDevInfoName + " - can not be executed, due to missing Permissions. Required Permissions: " + Arrays.toString(devInfoTask.requiredPermissions));
                continue;
            } else {
                devInfoTask.handle(req, responseJSON);
            }
        }
        new NativeResponse(req).send(responseJSON);
    }
}
