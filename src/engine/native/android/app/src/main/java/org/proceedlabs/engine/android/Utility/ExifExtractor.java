package org.proceedlabs.engine.android.Utility;

import android.media.ExifInterface;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;

public class ExifExtractor {
    // not in use,
    public static JSONObject getExifJSON(File imageFile) {
        JSONObject exifData = new JSONObject();
        getExifJSON(imageFile, exifData);
        return exifData;
    }

    public static void getExifJSON(File imageFile, JSONObject outputData) {
        try {
            ExifInterface exif = new ExifInterface(imageFile.getPath());

            //get Position
            float[] latlong = new float[2];
            exif.getLatLong(latlong);
            if (!(latlong[0] == 0 && latlong[1] == 0)) {
                outputData.put("Lat", latlong[0]);
                outputData.put("Lng", latlong[0]);
            }
            double def = -999d;
            double altitude = exif.getAltitude(def);
            if (altitude != def)
                outputData.put("Altitude", altitude);

            // get resolution
            int resX = exif.getAttributeInt(ExifInterface.TAG_X_RESOLUTION, -1);
            int resY = exif.getAttributeInt(ExifInterface.TAG_Y_RESOLUTION, -1);
            if (resX != -1 && resY != -1) {
                outputData.put("ResX", resX);
                outputData.put("ResY", resY);
            }

        } catch (IOException e) {

        } catch (JSONException j) {

        }
    }
}
