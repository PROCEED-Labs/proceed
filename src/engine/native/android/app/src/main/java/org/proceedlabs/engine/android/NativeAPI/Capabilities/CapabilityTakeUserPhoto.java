package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.core.content.FileProvider;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.FileIO;

import java.io.File;
import java.io.IOException;

import static android.app.Activity.RESULT_OK;

public class CapabilityTakeUserPhoto extends CapabilitieTask {

    public static int PICTURE_REQUEST_CODE = 1;
    private static String fileName;
    private static NativeRequest pendingRequest;
    public CapabilityTakeUserPhoto() {
        capabilitiekNames = new String[]{"takeUserPhoto"};
        requiredPermissions = new String[]{Manifest.permission.CAMERA};
    }

    public static void onTakePictureCallback(int resultCode, Intent data) {
        if (resultCode == RESULT_OK) {
            File file = new File(fileName);
            int sizeKB = pendingRequest.getArgs().optInt(1, -1);    //todo an API anpassen

            new NativeResponse(pendingRequest).sendImageFile(file, sizeKB, pendingRequest.getContext());

        } else {
            new NativeResponse(pendingRequest).sendError("Fehler bei der Aufnahme");
        }
        pendingRequest = null;
    }

    @Override
    public void handle(NativeRequest req) throws IOException {
        takePhoto(req);
    }

    public void takePhoto(NativeRequest req) throws IOException {
        if (pendingRequest != null) {   //new Picture request, but still one in progress
            new NativeResponse(pendingRequest).sendError("neuer FooRequest wird nun bevorzugt");
        }

        pendingRequest = req;

        File pictureFile = FileIO.createImageFile(req);
        fileName = pictureFile.getAbsolutePath();

        Uri uri = FileProvider.getUriForFile(                   // todo: @BA androidx lecary support??
                req.getContext(),
                req.getContext().getApplicationContext().getPackageName() + ".fileprovider", pictureFile);

        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
        req.getContext().startActivityForResult(intent, PICTURE_REQUEST_CODE);
    }
}
