package org.proceedlabs.engine.android.Utility;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

public class ImageCompression {
    // code found on the Internet a few years ago
    //call this async!
    public static File processImage(File jpgPicture, double maxSizeKB, Context c) {
        if (jpgPicture.length() / 1024 < maxSizeKB || maxSizeKB <= 0)
            return jpgPicture;
        long imageSize = 0;
        int detail = 100;
        File newFile;
        try {
            Bitmap rotatedBitmap = getRotatedBitmapOfImage(jpgPicture);
            do {
                newFile = FileIO.createFile("imageCompressed", "small_" + jpgPicture.getName(), c);
                FileOutputStream out = new FileOutputStream(newFile);
                rotatedBitmap.compress(Bitmap.CompressFormat.JPEG, detail, out);
                out.flush();
                out.close();
                imageSize = newFile.length() / 1024;
                detail -= 5;
                Log.i("compressing", "target: " + maxSizeKB + "| actual:" + imageSize + "@scale:" + detail);
            } while (imageSize > maxSizeKB);
        } catch (Exception e) {
            return null;
        }
        return newFile;
    }

    private static Bitmap getRotatedBitmapOfImage(File f) {
        int rotation = 0;
        Bitmap b = decodeFileCompressed(f);
        //read Picture Orientation
        try {
            ExifInterface exif = new ExifInterface(f.getPath());
            int exifRotation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            rotation = exifToDegrees(exifRotation);
        } catch (Exception e) {
            e.printStackTrace();
        }
        Matrix matrix = new Matrix();
        if (rotation != 0f) {
            matrix.preRotate(rotation);
            b = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), matrix, true);
        }
        return b;
    }

    private static Bitmap decodeFileCompressed(File f) {
        Bitmap b = null;

        //Decode image size
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;

        FileInputStream fis = null;
        try {
            fis = new FileInputStream(f);
            BitmapFactory.decodeStream(fis, null, o);
            fis.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }

        int scale = 1;

        //Decode with inSampleSize
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = scale;
        try {
            fis = new FileInputStream(f);
            b = BitmapFactory.decodeStream(fis, null, o2);
            fis.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return b;
    }

    private static int exifToDegrees(int exifOrientation) {
        if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_90) {
            return 90;
        } else if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_180) {
            return 180;
        } else if (exifOrientation == ExifInterface.ORIENTATION_ROTATE_270) {
            return 270;
        }
        return 0;
    }
}
