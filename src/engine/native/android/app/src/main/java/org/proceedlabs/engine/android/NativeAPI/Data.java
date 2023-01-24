package org.proceedlabs.engine.android.NativeAPI;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

//checked
public class Data extends IPCTask {
    final static String tableName = " table";

    public Data() {
        taskNames = new String[]{"read", "write"};
    }


    @Override
    public void handle(NativeRequest req) throws JSONException {
        switch (req.getTaskName()) {
            case "read":
                readCommand(req);
                break;
            case "write":
                writeCommand(req);
                break;
        }
    }


    public static void readCommand(NativeRequest req) throws JSONException {
        JSONArray args = req.getArgs();
        String tableKey = args.getString(0);
        String val;
        String key;
        String table = tableKey.split("/")[0];

        SharedPreferences pref = req.getContext().getSharedPreferences(table, Context.MODE_PRIVATE);

        if (tableKey.contains("/")) {
            //read specific key
            key = tableKey.split("/")[1];
            if (pref.contains(key)) {
                //value exists
                val = pref.getString(key, "");
                new NativeResponse(req).send(val);

            } else {
                //value not present -> error handling
                new NativeResponse(req).sendError("der gesuchte Key ist nicht in der Tabelle enthalten!");
            }
        } else {
            //read whole table
            Map<String, String> allVals = (Map<String, String>) pref.getAll();

            if (allVals.size() == 0) {
                new NativeResponse(req).send();
                return;
            }
            JSONObject resp = new JSONObject();

            for (String k : allVals.keySet()) {
                resp.put(k, allVals.get(k)).toString();

            }

            new NativeResponse(req).send(resp);
        }
    }

    public synchronized static void writeCommand(NativeRequest req) throws JSONException {
        JSONArray args = req.getArgs();
        String tableKey = args.getString(0);
        String key;
        String table;
        table = tableKey.split("/")[0];

        SharedPreferences pref = req.getContext().getSharedPreferences(table, Context.MODE_PRIVATE);

        if (tableKey.contains("/")) {
            key = tableKey.split("/")[1];

            if (!args.isNull(1)) {
                //write Data
                String val = args.getString(1);
                pref.edit().putString(key, val).apply();
            } else {
                //delete onnly key from table
                pref.edit().remove(key).apply();
            }
        } else {
            //delete table
            pref.edit().clear().apply();
        }

        new NativeResponse(req).send();
    }



}
