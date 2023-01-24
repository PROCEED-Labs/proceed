package org.proceedlabs.engine.android.FormatAPI;

import org.proceedlabs.engine.android.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;

/*
 * This class represents a Request, send by the universal part to the native part.
 * it offers functionallity for logging, and parameter handling, and application-context
 *
 * a NativeRequest is needed to create a NativeResponse
 *
 * */
public class NativeRequest {
    //
    private static long nextID = 0;

    private JSONArray originalMessage;
    private JSONArray args;
    private MainActivity context;
    private long internalID;
    private String taskID;
    private String taskName;

    //extracts necessary information as early as possible to detect an error
    public NativeRequest(String message, MainActivity context) throws JSONException {
        this.originalMessage = new JSONArray(message);
        this.args = originalMessage.getJSONArray(2);
        this.taskID = originalMessage.getString(0);
        this.taskName = originalMessage.getString(1).toLowerCase();
        this.context = context;
        internalID = nextID++;
    }

    public long getInternalID() {
        return internalID;
    }

    public String getTaskID() {
        return taskID;
    }

    public String getTaskName() {
        return taskName.toString();
    }

    public JSONArray getArgs() {
        return args;
    }

    public MainActivity getContext() {
        return context;
    }

    public String getConsoleString() {
        String msg = "<- " + internalID + "\t" + taskName; //todo: refactor
        msg += "(" + getArgs().toString() + ")";
        return msg;
    }

    public String toString() {
        return originalMessage.toString();
    }

    public String toConsoleString() {
        return "<- " + getInternalID() + " \t" + taskName + " - " + getArgs();
    }
}
