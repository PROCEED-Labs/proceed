package org.proceedlabs.engine.android.NativeAPI;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.AssesIO;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.Iterator;

public class Configuration extends IPCTask {
    public static final String tag = Configuration.class.getSimpleName();

    public Configuration() {
        taskNames = new String[]{"read_config", "write_config"};
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getTaskName()) {
            case "read_config":
                readConfig(req);
                break;
            case "write_config":
                writeConfig(req);
                break;

        }
    }

    public void readConfig(NativeRequest req) throws JSONException {
        JSONObject confDefault = getDefaultConfig(req);
        JSONObject confUser = getUserConfig(req);

        Log.d(tag, "User configuration: " + confUser.toString());

        mergeConfig(confDefault, confUser);

        new NativeResponse(req).send(confDefault);
    }

    public void writeConfig(NativeRequest req) throws JSONException {
        JSONObject userConfig = getUserConfig(req);
        JSONObject newConfVals = req.getArgs().optJSONObject(0);
        if (newConfVals == null) {
            new NativeResponse(req).sendError("Missing Parameter: new Config ");
            return;
        }
        boolean overwriteAll = req.getArgs().optBoolean(1, false);

        if (overwriteAll)
            setUserConfig(newConfVals, req);
        else {
            mergeConfig(userConfig, newConfVals);
            setUserConfig(userConfig, req);
        }

        readConfig(req);        //Todo: write about
    }

    private JSONObject getUserConfig(NativeRequest req) {
        SharedPreferences pref = req.getContext().getSharedPreferences("ConfigTable", Context.MODE_PRIVATE);
        if (!pref.contains("userConfig")){
            return new JSONObject();
        }

        try {
            return new JSONObject(pref.getString("userConfig", "err!"));
        } catch (JSONException ex) {
            pref.edit().remove("userConfig").apply();
            return new JSONObject();
        }
    }

    private JSONObject getDefaultConfig(NativeRequest req) throws JSONException {
        JSONObject defaultConfig = new JSONObject(AssesIO.readAsset("config_default.json", req.getContext()));

        // hard-code that the Android App accepts user tasks by default
        try {
            defaultConfig.getJSONObject("processes").put("acceptUserTasks", true);
        }catch (JSONException e){
            Log.w(tag, "'processes.acceptUserTasks' does not seem to exist in config_default.json");
        }
        Log.d(tag, "Read default config from asset folder: " + defaultConfig.toString());
        return defaultConfig;
    }

    private void setUserConfig(JSONObject userConfig, NativeRequest req) {
        SharedPreferences pref = req.getContext().getSharedPreferences("ConfigTable", Context.MODE_PRIVATE);
        pref.edit().putString("userConfig", userConfig.toString()).apply();
    }

    private void mergeConfig(JSONObject defaultConfig, JSONObject newVals) throws JSONException {
        for (Iterator<String> it = newVals.keys(); it.hasNext(); ) {
            String key = it.next();

            // optXXX methods on JSONObject give back a default value if the key does not exist: https://developer.android.com/reference/org/json/JSONObject.html
            // getXXX would throw an Error
            if (defaultConfig.optJSONObject(key) != null && newVals.optJSONObject(key) != null) {
                mergeConfig(defaultConfig.getJSONObject(key), newVals.getJSONObject(key));
            } else {
                defaultConfig.put(key, newVals.get(key));
            }
        }
    }
}
