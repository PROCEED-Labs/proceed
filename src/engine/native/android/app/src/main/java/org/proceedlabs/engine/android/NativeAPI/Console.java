package org.proceedlabs.engine.android.NativeAPI;

import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONException;

public class Console extends IPCTask {

    public Console() {
        taskNames = new String[]{"console_log"};
    }

    @Override
    public void handle(NativeRequest req) throws JSONException {
        Log.i("Univ", req.getArgs().getString(0));
        new NativeResponse(req).send();
    }
}
