package org.proceedlabs.engine.android.FormatAPI.Interfaces;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.MainActivity;

import org.json.JSONException;

import java.io.IOException;

public abstract class IPCTask extends Task {
    public boolean selfHandlePermissions;       //set True in extending class, to self-handle Permissions. normally task a is not called by Main, if Permissions are not granted.
    public String[] taskNames = {};

    public abstract void handle(NativeRequest req) throws JSONException, IOException;

    @Override
    public boolean checkPermissions(MainActivity main) {
        return super.checkPermissions(main) || selfHandlePermissions;
    }
}
