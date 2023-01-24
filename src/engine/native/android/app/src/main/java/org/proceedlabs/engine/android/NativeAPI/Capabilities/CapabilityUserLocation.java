package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Looper;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

public class CapabilityUserLocation extends CapabilitieTask {

    public CapabilityUserLocation() {
        requiredPermissions = new String[]{Manifest.permission.ACCESS_FINE_LOCATION,};
        capabilitiekNames = new String[]{"getUserLocation"};
        //add JSON_LD here
    }

    @SuppressLint("MissingPermission")
    public static void getLocation(NativeRequest req) {
        LocationManager locationManager = (LocationManager) req.getContext().getSystemService(Context.LOCATION_SERVICE);
        LocationListener loc = new LocationListener() {
            @Override
            public void onLocationChanged(android.location.Location location) {
                JSONObject resp = new JSONObject();
                try {
                    resp.put("Lat", location.getLatitude());
                    resp.put("Lng", location.getLongitude());
                    resp.put("Time", location.getTime() / 1000);
                    resp.put("Accuracy ", location.getAccuracy());
                    resp.put("Altitude ", location.getAltitude());
                    new NativeResponse(req).send(resp);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {

            }

            @Override
            public void onProviderEnabled(String provider) {

            }

            @Override
            public void onProviderDisabled(String provider) {

            }
        };
        locationManager.requestSingleUpdate("gps", loc, Looper.getMainLooper());
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        getLocation(req);
    }


}
