package org.proceedlabs.engine.android.NativeAPI.Server;

import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.FileIO;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

//checke, options-request not present in express-implementation
public class Server extends NanoHTTPD {
    public static LinkedHashMap<String, LinkedHashMap<Method, NativeRequest>> paths; //sore served Pathes here  map path -> methods, each method -> NativeRequest
    public static LinkedHashMap<String, NativeRequest> uniVResponses;

    static {
        paths = new LinkedHashMap<>();
        uniVResponses = new LinkedHashMap<>();
    }

    int sessionCount = 0;

    public Server(int port) {
        super(port);
    }

    private Server(String hostname, int port) {
        super(hostname, port);
    }

    private synchronized String getSessionID() {
        return "" + sessionCount++;
    }

    private NanoHTTPD.Response serveOptionsRequest(NanoHTTPD.IHTTPSession session) {
        Log.i("body", session.getParameters() + "");
        Response resp = newFixedLengthResponse("");
        String supportedMethods = "";

        LinkedHashMap<Method, NativeRequest> path = getSupportedMethodsByURL(session.getUri());
        for (Method method : path.keySet()) {
            supportedMethods += method + ", ";
        }
        supportedMethods = supportedMethods.substring(0, supportedMethods.length() - 2);

        resp.addHeader("Access-Control-Allow-Methods", supportedMethods);
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Headers", "*");


        return resp;

    }

    /*
     * concept:
     * 1. check if URL is in the supported-paths "paths" List
     * 2. check if http-Method is as specified by the supported-path
     * 3. send the client request to the universal part
     * 4. wait for the anser of the universal part
     * 5. send the anser to the client
     *
     * */
    @Override
    public NanoHTTPD.Response serve(NanoHTTPD.IHTTPSession session) {
        if (session.getMethod() == Method.OPTIONS)
            return serveOptionsRequest(session);

        LinkedHashMap<Method, NativeRequest> path = getSupportedMethodsByURL(session.getUri());

        if (path == null)  //Path not served
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", ""); //error path not known

        NativeRequest serveRequest = path.get(session.getMethod());
        if (serveRequest == null) //method not served
            return newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "");
        try {
            //send to Universal
            JSONObject univResponse = createMessageToUniversal(session, serveRequest);
            String sessionID = getSessionID();
            new NativeResponse(serveRequest).put(sessionID).send(univResponse);

            //wait for answer
            int sleepCyleCount = 0;
            while (sleepCyleCount < 1000) {
                try {
                    Thread.currentThread().sleep(10);
                } catch (InterruptedException e) {
                }

                //check for Answer
                if (uniVResponses.containsKey(sessionID)) {
                    //send Answer
                    NativeRequest uniResp = uniVResponses.get(sessionID);
                    String msg = uniResp.getArgs().getString(0);
                    int statusCode = uniResp.getArgs().getInt(2);
                    String contentTxpe = uniResp.getArgs().getString(3);

                    Response.IStatus mapedStatusCode = Response.Status.lookup(statusCode);
                    if (mapedStatusCode == null) {
                        Log.i("statusCodeErr", statusCode + "");
                        new NativeResponse(uniResp).sendError("der gewünschte Status-Code wird nicht unterstützt");
                        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "unsopported internal HTTP-status-Code");
                    }

                    Response resp = newFixedLengthResponse(mapedStatusCode, contentTxpe, msg);
                    if (serveRequest.getArgs().getJSONObject(2).optBoolean("cors", false))
                        resp.addHeader("Access-Control-Allow-Origin", "*");
                    return resp;
                }
            }
            //Universal has not responded
            return newFixedLengthResponse(Response.Status.REQUEST_TIMEOUT, "text/plain", "timeout");

        } catch (Exception ex) {
            //error handling
        }
        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", ""); //error path not known
    }

    private JSONObject createMessageToUniversal(NanoHTTPD.IHTTPSession session, NativeRequest serveRequest) throws JSONException {
        JSONObject univResp = new JSONObject();
        univResp.put("hostname", session.getRemoteHostName());
        univResp.put("ip", session.getRemoteIpAddress());
        univResp.put("method", session.getMethod());
        univResp.put("params", getParams(serveRequest, session.getUri()));
        univResp.put("query", formatParameters(session.getParameters()));
        univResp.put("path", session.getUri());
        univResp.put("files", new JSONArray());
        if (session.getMethod() == Method.POST || session.getMethod() == Method.PUT) {

            HashMap<String, String> map = new HashMap<>();
            try {
                session.parseBody(map);
            } catch (IOException e) {
                e.printStackTrace();
            } catch (ResponseException e) {
            }

            //get Request Body
            if (session.getMethod() == Method.POST) {
                final String json = map.get("postData");

                // json or text?
                if (session.getHeaders().get("content-type").contains("json"))
                    univResp.put("body", new JSONObject(json));
                else
                    univResp.put("body", json);

            } else if (session.getMethod() == Method.PUT) {
                try {
                    String path = map.get("content");
                    Log.i("UploadFilesPath", path);
                    File f = new File(path);
                    String fielContent = FileIO.readFile(f);    //todo: test if working correctly, after reading whole Fle instead of just one line
                    Log.i("UploadFilesContents ", fielContent);

                    univResp.put("body", new JSONObject(fielContent));
                } catch (Exception ex) {
                }
            }
        }
        return univResp;
    }

    // put query parameters in a JSONObject
    private JSONObject formatParameters(Map<String, List<String>> params) throws JSONException {
        JSONObject obj = new JSONObject();

        for (String s : params.keySet()) {
            List<String> parameterListForKey = params.get(s);
            if (parameterListForKey.size() == 1)
                obj.put(s, parameterListForKey.get(0));
            else
                obj.put(s, new JSONArray(params.get(s)));
        }
        return obj;
    }

    //get :id -like parameters from URL
    private JSONObject getParams(NativeRequest pathJSON, String req) throws JSONException {
        String path = pathJSON.getArgs().getString(1);

        JSONObject params = new JSONObject();

        String[] pathArr = path.split("/");
        String[] reqArr = req.split("/");

        for (int i = 0; i < pathArr.length; i++) {
            if (pathArr[i].contains(":"))
                params.put(pathArr[i].substring(1), reqArr[i]);
        }
        return params;
    }

    //find the original Serve-request (from universal) for this specific path
    private LinkedHashMap<Method, NativeRequest> getSupportedMethodsByURL(String reqPath) {
        for (String path : paths.keySet()) {
            if (equals(path, reqPath))
                return paths.get(path);
        }
        return null;
    }

    //check, if a given request-URL matches a specific path-pattern
    private boolean equals(String path, String request) {
        String[] pathArr = path.split("/");
        String[] reqArr = request.split("/");

        if (reqArr.length > pathArr.length + 1) return false;   //URL to long
        if (reqArr.length < pathArr.length) return false;   //URL to short
        if (reqArr.length == pathArr.length + 1 && !reqArr[reqArr.length - 1].equals(""))
            return false;   //edge-case: / at the end

        for (int i = 0; i < pathArr.length; i++) {
            //check if every sub-segment is equal, or parameter like :id
            if (!reqArr[i].equals(pathArr[i]) && !pathArr[i].contains(":")) return false;
        }
        return true;
    }
}
