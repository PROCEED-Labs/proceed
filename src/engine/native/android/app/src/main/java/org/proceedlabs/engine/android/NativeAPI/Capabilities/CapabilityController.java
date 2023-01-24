package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.Interfaces.IPCTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.NativeAPI.Capabilities.CapabilitySilentPhoto.CapabilitySilentPhotoController;

import org.json.JSONArray;
import org.json.JSONException;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;


// Übersicht
// https://gitlab.com/dBPMS-PROCEED/proceed/-/wikis/Engine/Universal/Capability-Module/Capabilities_Android

// Test API
// https://gitlab.com/dBPMS-PROCEED/proceed/-/wikis/Engine/REST-Endpoints#engine-requesting-capability-information


public class CapabilityController extends IPCTask {
    private HashMap<String, CapabilitieTask> registeredCapabilitieTasks = new HashMap<>();

    private CapabilitieTask[] implementedCapabilities = {
            new CapabilitySilentPhotoController(),
            new CapabilityAudioPlayer(),
            new CapabilityAudioRecorder(),
            new CapabilityNFCScanner(),
            new CapabilityUserLocation(),
            new CapabilityTakeUserPhoto(),
            //add Capabilities here
    };

    public CapabilityController() {
        taskNames = new String[]{"performcapabilitie", "allcapabilities"};
        selfHandlePermissions = true;   //only display Capabiliteis with granted Permissions

        // register all Capabilities, get needed Permissions
        for (CapabilitieTask task : implementedCapabilities) {
            this.addPermission(task.requiredPermissions);

            for (String capabilitie : task.capabilitiekNames) {
                registeredCapabilitieTasks.put(capabilitie, task);
            }
        }
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getTaskName()) {
            case "performcapabilitie":
                performcapabilitie(req);
                break;
            case "allcapabilities":
                allcapabilities(req);
                break;
        }
    }

    private void allcapabilities(NativeRequest req) {
        JSONArray resposne = new JSONArray();
        for (CapabilitieTask task : implementedCapabilities) {
            if (!task.checkPermissions(req.getContext()))     // hide Capabilities, with missing permissions
                continue;

            if (task.JSON_LD == null)              // hide Capabilities, without JSON_LD
                continue;
            for (String s : task.JSON_LD) {
                resposne.put(s);
            }
        }
        new NativeResponse(req).send(resposne);
    }

    private void performcapabilitie(NativeRequest req) throws IOException, JSONException {
        String capabilitieName = req.getArgs().getString(0);
        CapabilitieTask capabilitieTask = registeredCapabilitieTasks.get(capabilitieName);

        if (capabilitieTask == null) {
            new NativeResponse(req).sendError("The requested Capability has not been implemented oder registrerd!");
            return;
        }

        if (!capabilitieTask.checkPermissions(req.getContext())) {
            new NativeResponse(req).sendError("not all required Permissions are granted by User! Permissions are: " + Arrays.toString(capabilitieTask.requiredPermissions));
            return;
        }

        capabilitieTask.handle(req);
    }
}
