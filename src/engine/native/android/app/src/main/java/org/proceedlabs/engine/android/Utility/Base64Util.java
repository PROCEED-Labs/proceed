package org.proceedlabs.engine.android.Utility;

import android.content.Context;
import android.util.Base64;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

public class Base64Util {
    // http://www.java2s.com/example/android-utility-method/base64-file-decode/decoderbase64filewithfilename-string-base64code-string-filename-e44f0.html
    public static File decoderBase64FileWithFileName(String base64Code, String fileName, Context c) {
        File file = FileIO.createFile("temp", fileName, c);
        byte[] buffer = Base64.decode(base64Code, Base64.DEFAULT);
        try {
            FileOutputStream out = new FileOutputStream(file.getAbsoluteFile());
            out.write(buffer);
            out.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return file;
    }

    //http://www.java2s.com/example/android/java.io/encode-file-content-to-base64-string-from-path.html
    public static String getBase64FromPath(File file) {
        String base64 = "";
        try {
            byte[] buffer = new byte[(int) file.length() + 100];
            int length = new FileInputStream(file).read(buffer);
            base64 = Base64.encodeToString(buffer, 0, length,
                    Base64.DEFAULT);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return base64;
    }
}
