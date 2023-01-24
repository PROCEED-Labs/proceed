package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import android.nfc.Tag;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONException;

import java.io.IOException;

public class CapabilityNFCScanner extends CapabilitieTask {
    static NativeRequest pendinfRequest;

    public CapabilityNFCScanner() {
        capabilitiekNames = new String[]{"startNFCscanner", "stopNFCscanner", "scannForNFCtag"};
        //JSON_LD="nfc";
    }

    public static boolean tryToHandleNFCTag(Tag tag) throws JSONException {
        byte[] id = tag.getId();
        String serialNumber = ByteArrayToHexString(id);

        if (pendinfRequest == null)
            return false;

        if (pendinfRequest.getArgs().getString(0).equalsIgnoreCase("scannForNFCtag")) {
            if (pendinfRequest.getArgs().getString(1).equals(serialNumber)) {
                new NativeResponse(pendinfRequest).send();
                pendinfRequest = null;
            }
        } else
            new NativeResponse(pendinfRequest).send(serialNumber);
        return true;
    }

    // https://gist.github.com/luixal/5768921
    private static String ByteArrayToHexString(byte[] inarray) {
        int i, j, in;
        String[] hex = {"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"};
        String out = "";

        for (j = 0; j < inarray.length; ++j) {
            in = (int) inarray[j] & 0xff;
            i = (in >> 4) & 0x0f;
            out += hex[i];
            i = in & 0x0f;
            out += hex[i];
        }
        return out;
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getArgs().getString(0)) {
            case "startNFCscanner":
                tryStart(req);
                break;
            case "stopNFCscanner":
                pendinfRequest = null;
                break;
            case "scannForNFCtag":
                req.getArgs().getString(1);    //validity check
                pendinfRequest = req;
                break;
        }
    }

    private synchronized void tryStart(NativeRequest req) throws JSONException {
        if (pendinfRequest == null)
            pendinfRequest = req;
        else if (pendinfRequest.getArgs().getString(0).equalsIgnoreCase("scannForNFCtag")) {
            new NativeResponse(pendinfRequest).sendError("now scanning for all Tags");
            pendinfRequest = req;
        } else
            new NativeResponse(req).sendError("already scanning for a Tag");

    }


}
