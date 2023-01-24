package org.proceedlabs.engine.android;

import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.Interfaces.Task;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.NativeAPI.Capabilities.CapabilityController;
import org.proceedlabs.engine.android.NativeAPI.Configuration;
import org.proceedlabs.engine.android.NativeAPI.Console;
import org.proceedlabs.engine.android.NativeAPI.Data;
import org.proceedlabs.engine.android.NativeAPI.DeviceInfo.DeviceInfoController;
import org.proceedlabs.engine.android.NativeAPI.Discovery;
import org.proceedlabs.engine.android.NativeAPI.Server.ServerController;

import java.util.Arrays;
import java.util.HashMap;

public class IPCController extends Task {
    private static HashMap<String, IPCTask> registeredTasks = new HashMap<>();
    MainActivity instance;
    private IPCTask[] implementedIPCTasks = {
            new CapabilityController(),
            new DeviceInfoController(),
            new Discovery(),
            new ServerController(),
            new Configuration(),
            new Console(),
            new Data(),
            /// add IPCTasks here
    };

    public IPCController(MainActivity instance) {
        this.instance = instance;
        for (IPCTask IPCTask : implementedIPCTasks) {
            // get reqquired Permissions of each task
            this.addPermission(IPCTask.requiredPermissions);

            // map each served taskName to that task
            for (String taskName : IPCTask.taskNames) {
                registeredTasks.put(taskName, IPCTask);
            }
        }
    }

    public void receiveIPC(NativeRequest req) {
        Log.i("PRC", req.getConsoleString());

        //check if requested Task exists
        IPCTask requestedIPCTask = registeredTasks.get(req.getTaskName());
        if (requestedIPCTask == null) {
            new NativeResponse(req).sendError("The requested Task has not been implemented oder registered!");
            return;
        }

        //check if Permission for Task ist granted by User
        if (!requestedIPCTask.checkPermissions(req.getContext())) {
            new NativeResponse(req).sendError("not all required Permissions are granted by User! Permissions are: " + Arrays.toString(requestedIPCTask.requiredPermissions));
            return;
        }

        //try to serve requested Task
        try {
            requestedIPCTask.handle(req);
        } catch (Exception e) {
            e.printStackTrace();
            new NativeResponse(req).sendError("Error while serving the Request:" + e.getMessage());
        }
    }

    public void sendIPC(NativeResponse res) {
        logIPC(res);
        String jsCode = "ipcReceive(" + res.getMessage() + ");";
        instance.wvInstance.postToUniversal(jsCode);
    }
    private void logIPC(NativeResponse res){
        if(res.isError())
            Log.e("PRC", res.toConsoleString());
        else
            Log.i("PRC", res.toConsoleString());
    }
}
