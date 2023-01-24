package org.proceedlabs.engine.android.NativeAPI.Capabilities.CapabilitySilentPhoto;

import android.Manifest;
import android.content.Intent;
import android.hardware.camera2.CameraCharacteristics;
import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.FileIO;

import org.json.JSONException;

import java.io.File;
import java.io.IOException;

public class CapabilitySilentPhotoController extends CapabilitieTask {
    private static NativeRequest pendingRequest;

    public CapabilitySilentPhotoController() {
        capabilitiekNames = new String[]{"takeSilentPhoto"};
        requiredPermissions = new String[]{Manifest.permission.CAMERA};
    }

    public static synchronized void takePhoto(NativeRequest req) {
        if (pendingRequest != null) {
            new NativeResponse(req).sendError("already taking Picture!");
            return;
        }
        pendingRequest = req;
        //choose lense
        boolean frontlende = req.getArgs().optBoolean(1, false);
        CapabilitySilentPhotoService.CAMERACHOICE = frontlende ? CameraCharacteristics.LENS_FACING_FRONT : CameraCharacteristics.LENS_FACING_BACK;
        try {
            Intent serviceIntent = new Intent(req.getContext(), CapabilitySilentPhotoService.class);
            req.getContext().startService(serviceIntent);
        } catch (IllegalStateException iex) {
            new NativeResponse(req).sendError("cant take photo at this moment");
            pendingRequest = null;
        }
    }

    public static void onPictureTaken(File file) {
        if (pendingRequest == null)
            return;
        Log.i("silentCamera", "took Photo");
        int sizeKB = pendingRequest.getArgs().optInt(1, -1);    //todo an API anpassen

        //send to Univ
        new NativeResponse(pendingRequest).sendImageFile(file, sizeKB, pendingRequest.getContext());

        //terminate Service!
        pendingRequest = null;
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        takePhoto(req);
    }
}
