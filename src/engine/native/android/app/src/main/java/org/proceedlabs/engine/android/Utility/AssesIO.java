package org.proceedlabs.engine.android.Utility;

import android.content.Context;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class AssesIO {
    //inspired by https://stackoverflow.com/questions/9544737/read-file-from-assets
    public static String readAsset(String assetFileName, Context c) {
        String assetContent = "";
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new InputStreamReader(c.getAssets().open(assetFileName), "UTF-8"));
            String mLine;
            while ((mLine = reader.readLine()) != null) {
                assetContent += mLine;
            }
        } catch (IOException e) {
            Log.e("ERROR", "asset not found?");
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
        return assetContent;
    }
}
