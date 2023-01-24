package org.proceedlabs.engine.android.FormatAPI.Interfaces;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;

import java.io.IOException;

public abstract class CapabilitieTask extends Task {
    public String[] JSON_LD;
    public String[] capabilitiekNames = {};

    public abstract void handle(NativeRequest req) throws JSONException, IOException;
}
