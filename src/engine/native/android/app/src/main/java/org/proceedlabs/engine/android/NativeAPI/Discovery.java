package org.proceedlabs.engine.android.NativeAPI;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.DiscoveryRegistrationListener;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;


/*
 * This class offers functionality to find other proceed mashines within the same network
 * once the class ist called the first time, it initializes the background search (tryInit())
 *
 * If a machine was found, it must be additionally resolved to get IP and port
 * this resolving is recommended to bee sequentially.
 *
 * All found and resolved Devices are stored in the "discoveredServices" List
 *
 *
 * This class could publish multiple Services at once.
 * To unpublish specific services, replace the code at "unpublishCommand()" with the comment
 *All published Servies are stored in the "publishedServices" List
 *
 * */

public class Discovery extends IPCTask {
    private final static String PROCCEED_TYPE = "_proceed._tcp";
    /* RESOLVING MASHINES
     *
     * this method is used to sequentially resolve the identitied devices
     * since the NsdManager class seems to be buggy, its recommended to handle the resolving this way
     *
     * This method gets called, when a new mashine is found OR a mashine has successfuly been resolved
     *
     * */
    static boolean currentlyResolving;
    private static NsdManager nsdManager;
    private static DiscoveryRegistrationListener publishedServices;  //userGivenName, listener
    private static String serviceName;
    private static HashMap<String, JSONObject> discoveredServices;
    private static LinkedList<NsdServiceInfo> resolveableDevices;

    public Discovery() {
        taskNames = new String[]{"publish", "discover", "unpublish"};
    }

    private static synchronized void tryInit(NativeRequest req) {
        if (nsdManager == null) {
            nsdManager = (NsdManager) req.getContext().getSystemService(Context.NSD_SERVICE);
            nsdManager.discoverServices(PROCCEED_TYPE, NsdManager.PROTOCOL_DNS_SD, getDiscoveryListene(req));
            discoveredServices = new HashMap<>();
            resolveableDevices = new LinkedList<>();
        }
    }

    /*
     * publish the mashine within the network
     *
     * */
    public synchronized static void publish(NativeRequest req) throws JSONException {
        tryInit(req);
        String name = req.getArgs().getString(0);
        if (publishedServices != null) {
            new NativeResponse(req).sendError("mDNS Server bereits gestartet!");
            return;
        }

        int port = req.getArgs().getInt(1);

        JSONObject serviceTxt = req.getArgs().optJSONObject(2);

        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setPort(port);
        serviceInfo.setServiceName(name);
        serviceInfo.setServiceType(PROCCEED_TYPE);
        serviceName = name;
        /*        if (serviceTxt != null)
            useRelectionToWriteTXT(serviceInfo);*/

        if (serviceTxt != null)
            for (Iterator<String> it = serviceTxt.keys(); it.hasNext(); ) {
                String s = it.next();
                serviceInfo.setAttribute(s, serviceTxt.getString(s));
            }
        nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, getRegistrationListener(req));
    }

    public static void discover(NativeRequest req) {
        tryInit(req);
        JSONArray resp = new JSONArray();
        for (JSONObject dev : discoveredServices.values()) {
            resp.put(dev);
        }
        new NativeResponse(req).send(resp);
    }

    public synchronized static void unpublish(NativeRequest req) {
        if (publishedServices == null) {
            if (req != null)
                new NativeResponse(req).sendError("cant stop a Sverice, before its started");
            return;
        }

        /*
         * To be able to respond to the universal part if the unpublish command has been processed successfully
         * the request needs to be passed to the registration-Listenner
         * */

        publishedServices.setParamsForUnregister(req);
        nsdManager.unregisterService(publishedServices);
    }


    /* LISTENERS
     * these listeners define the bahaviour, for the following events
     *
     * getRegistrationListener   ->  Events of publishing
     * getDiscoveryListene       ->  Events of device-search
     * getResolveListener        ->  Events of device-resolving
     * */

    private static DiscoveryRegistrationListener getRegistrationListener(NativeRequest req) {
        return new DiscoveryRegistrationListener() {
            NativeRequest unregisterRequest;

            @Override
            public void onRegistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
                publishedServices = null;
                new NativeResponse(req).sendError("Fehler beim registrieren des Services| Beschreibung unser https://developer.android.com/reference/android/net/nsd/NsdManager, suche nach FAILURE_ | Code: " + errorCode);
            }

            @Override
            public void onUnregistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
                if (unregisterRequest == null) return;

                new NativeResponse(unregisterRequest).sendError("Fehler beim unregistrieren des Services| Beschreibung unser https://developer.android.com/reference/android/net/nsd/NsdManager, suche nach FAILURE_ | Code: " + errorCode);
            }

            @Override
            public void onServiceRegistered(NsdServiceInfo serviceInfo) {
                publishedServices = this;   //put this service to the list of registered Services
                new NativeResponse(req).send();
            }

            @Override
            public void onServiceUnregistered(NsdServiceInfo serviceInfo) {
                publishedServices = null;
                if (unregisterRequest != null)
                    new NativeResponse(unregisterRequest).send();
            }

            @Override
            public void setParamsForUnregister(NativeRequest req) {
                this.unregisterRequest = req;
            }
        };
    }

    /*
     * discover mashines in the network
     *
     * if mashine ist found
     * add it to the "resolveableDevices" List an call "trySequentailResolving()" to get further information about it
     *
     * if connection is lost:
     * remove mashine from the "discoveredServices" List
     *
     * */
    private static NsdManager.DiscoveryListener getDiscoveryListene(NativeRequest req) {
        return new NsdManager.DiscoveryListener() {
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {

            }

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {

            }

            @Override
            public void onDiscoveryStarted(String serviceType) {

            }

            @Override
            public void onDiscoveryStopped(String serviceType) {

            }

            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                //service of  type Procceed but NOT self
                if (serviceInfo.getServiceType().contains(PROCCEED_TYPE) && !serviceInfo.getServiceName().equalsIgnoreCase(serviceName)) {
                    resolveableDevices.add(serviceInfo);
                }
                trySequentailResolving(false);
            }

            @Override
            public void onServiceLost(NsdServiceInfo serviceInfo) {
                discoveredServices.remove(serviceInfo.getServiceName());
            }
        };
    }

    /*
     * Try to get additionally information like IP and port from the idetified mashine
     * when successful, write information to the "discoveredServices" List
     * */
    private static NsdManager.ResolveListener getResolveListener() {
        return new NsdManager.ResolveListener() {

            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                Log.d("ResolveListener", "Resolv Failed" + serviceInfo.getServiceName());
                currentlyResolving = false;
            }

            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                JSONObject serviceJSON = new JSONObject();
                try {
                    serviceJSON.put("ip", serviceInfo.getHost().getHostAddress());
                    serviceJSON.put("port", serviceInfo.getPort());
                    serviceJSON.put("name", serviceInfo.getServiceName());
                    serviceJSON.put("txt", parseAttributes(serviceInfo));   //todo: may implement this, but not needed

                    discoveredServices.put(serviceInfo.getServiceName(), serviceJSON);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                Log.i("ResolveListener", "Resolv SUCC!!" + serviceJSON.toString());
                trySequentailResolving(true);
            }
        };
    }

    private static JSONObject parseAttributes(NsdServiceInfo serviceInfo) throws JSONException {
        JSONObject obj = new JSONObject();
        for (Map.Entry<String, byte[]> info : serviceInfo.getAttributes().entrySet()) {
            obj.put(info.getKey(), new String(info.getValue()));
        }
        return obj;
    }

    private static synchronized void trySequentailResolving(boolean calledAfterSuccessfulResolving) {
        if (currentlyResolving && !calledAfterSuccessfulResolving)
            return;

        if (calledAfterSuccessfulResolving)
            resolveableDevices.removeFirst();

        if (resolveableDevices.isEmpty())
            currentlyResolving = false;
        else {
            nsdManager.resolveService(resolveableDevices.getFirst(), getResolveListener());
            currentlyResolving = true;
        }
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getTaskName()) {
            case "publish":
                publish(req);
                break;
            case "discover":
                discover(req);
                break;
            case "unpublish":
                unpublish(req);
                break;
        }
    }
}
