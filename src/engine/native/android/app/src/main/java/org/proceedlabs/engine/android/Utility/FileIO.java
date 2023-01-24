package org.proceedlabs.engine.android.Utility;

import android.content.Context;
import android.os.Environment;

import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;

import static android.os.Environment.getExternalStorageDirectory;

public class FileIO {
    public static String readFile(File file) throws IOException {
        InputStream instream = new FileInputStream(file);
        InputStreamReader inputreader = new InputStreamReader(instream);
        BufferedReader buffreader = new BufferedReader(inputreader);
        StringBuilder sb = new StringBuilder();
        String line = null;
        while ((line = buffreader.readLine()) != null) {
            sb.append(line).append("\n");
        }
        buffreader.close();
        return sb.toString();
    }

    public static File createFile(String folder, String fileName, Context c) {
        File root = new File(c.getFilesDir(), folder);
        //File root = new File(Environment.getDataDirectory(), folder);
        if (!root.exists()) {
            root.mkdirs();
        }
        return new File(root, fileName);
    }

    public static File createImageFile(NativeRequest req) throws IOException {
        String imageFileName = "JPEG_" + req.getTaskID() + "_";
        File storageDir = req.getContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        File image = null;
        image = File.createTempFile(
                imageFileName,  /* prefix */
                ".jpg",         /* suffix */
                storageDir      /* directory */
        );
        return image;
    }

    /*
     *  use this method anywhere for debugging, to copy a file to the internal Storage for easy observation
     * ! Make sure, you have requestes the Permission, by adding WRITE_EXTERNAL_STORAGE in the MainActivitys "additionalPermissions" !
     *  https://stackoverflow.com/questions/9292954/how-to-make-a-copy-of-a-file-in-android
     */
    public static void DEBUGstoreFileInSDRoot(File file) {
        File dir = new File(getExternalStorageDirectory(), "PROCEED");   //not working on Android 10 (Exception!)
        if (!dir.exists()) {
            dir.mkdir();
        }
        File dst = new File(dir, file.getName());
        try (InputStream in = new FileInputStream(file)) {
            try (OutputStream out = new FileOutputStream(dst)) {
                dst.createNewFile();
                // Transfer bytes from in to out
                byte[] buf = new byte[1024];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
            }
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
