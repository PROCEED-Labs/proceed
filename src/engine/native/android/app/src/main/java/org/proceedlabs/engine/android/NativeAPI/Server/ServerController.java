package org.proceedlabs.engine.android.NativeAPI.Server;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONException;

import java.io.IOException;
import java.util.LinkedHashMap;

import fi.iki.elonen.NanoHTTPD;

public class ServerController extends IPCTask {
    Server server;

    public ServerController() {
        taskNames = new String[]{"serve", "respond", "setport", "unsetport"};
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getTaskName()) {
            case "serve":
                serve(req);
                break;
            case "respond":
                respond(req);
                break;
            case "setport":
                setport(req);
                break;
            case "unsetport":
                unsetport(req);
                break;
        }
    }

    public synchronized void serve(NativeRequest req) throws JSONException {
        String path = req.getArgs().getString(1);

        LinkedHashMap<NanoHTTPD.Method, NativeRequest> pathMap;
        if (Server.paths.containsKey(path))
            pathMap = Server.paths.get(path);
        else
            pathMap = new LinkedHashMap<>();

        NanoHTTPD.Method method = NanoHTTPD.Method.valueOf(req.getArgs().getString(0).toUpperCase());
        pathMap.put(method, req);

        Server.paths.put(path, pathMap);
    }

    /*
     * store the answer in the "uniVResponses" List, for the waitng resonse-thread to find it
     * */
    public void respond(NativeRequest req) throws JSONException {
        String sessionID = req.getArgs().getString(1);
        Server.uniVResponses.put(sessionID, req);
    }

    public synchronized void setport(NativeRequest req) throws JSONException, IOException {
        if (server != null) {
            new NativeResponse(req).sendError("Server beretis gestartet");
            return;
        }
        server = new Server(req.getArgs().getInt(0));
        server.start();
        new NativeResponse(req).send();
    }

    public void unsetport(NativeRequest req) {
        server.stop();
        new NativeResponse(req).send();
    }
}
