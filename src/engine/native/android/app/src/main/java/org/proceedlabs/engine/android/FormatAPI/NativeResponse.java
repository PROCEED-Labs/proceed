package org.proceedlabs.engine.android.FormatAPI;

import android.content.Context;

import org.proceedlabs.engine.android.Utility.Base64Util;
import org.proceedlabs.engine.android.Utility.ExifExtractor;
import org.proceedlabs.engine.android.Utility.ImageCompression;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;

/*
 * This class represents a Response, send by the native part to the universal part.
 * it offers functionallity for logging, and parameter handling
 *
 * a NativeRequest is needed to create a NativeResponse
 *
 * */

public class NativeResponse {
    private NativeRequest req;
    private JSONArray response;
    private JSONArray args;



    private boolean isError;

    public NativeResponse(NativeRequest req) {
        this.req = req;
        response = new JSONArray();
        response.put(req.getTaskID());
        args = new JSONArray().put(null); // JSONArray("[null]");
        response.put(args);
    }

    public void send(JSONArray arr) {
        put(arr);
        send();
    }

    public void send(JSONObject obj) {
        put(obj);
        send();
    }

    public void send() {
        req.getContext().ipcController.sendIPC(this);
    }

    public void sendError(String errorMessage) {
        try {
            response.put(1, new JSONArray().put(errorMessage));
        } catch (JSONException e) {
        }
        isError = true;
        req.getContext().ipcController.sendIPC(this);
    }

    public NativeResponse put(JSONArray arr) {
        args.put(arr);
        return this;
    }

    public NativeResponse put(JSONObject obj) {
        args.put(obj);
        return this;
    }

    public void send(String str) {
        put(str);
        send();
    }

    public NativeResponse put(String str) {
        args.put(str);
        return this;
    }

    public void sendImageFile(File file, double maxSizeKB, Context c) {
        JSONObject res = ExifExtractor.getExifJSON(file);
        File compressedPhoto = ImageCompression.processImage(file, maxSizeKB, c);

        if (compressedPhoto == null) {
            sendError("Compression Error, cant compress to target");
            return;
        }

        send(file, res, FileCodec.JPG);
    }

    public void send(File file, FileCodec type) {
        send(file, new JSONObject(), type);
    }

    public void send(File file, JSONObject parameter, FileCodec codec) {
        try {
            parameter.put("codec", codec.toString());
            parameter.put("data", Base64Util.getBase64FromPath(file));
            send(parameter);
        } catch (JSONException e) {
            try {
                response.put(1, new JSONArray().put("FormatierungsFehler beim erstellen der Nachricht (zugroße Datei?)"));  //use sendError instead?
                send();
            } catch (JSONException ex) {
            }
        }
    }

    public String getMessage() {
        return response.toString();
    }

    public String toConsoleString() {
        return "-> " + req.getInternalID() + "  \t" + req.getTaskName() + " - " + response.optJSONArray(1);
    }

    public boolean isError() {
        return isError;
    }
    public enum FileCodec {JPG, ACC}
}
