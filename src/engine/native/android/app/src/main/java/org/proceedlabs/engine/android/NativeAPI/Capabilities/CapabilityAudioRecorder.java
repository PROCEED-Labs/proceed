package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import android.Manifest;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.FileIO;

import org.json.JSONException;

import java.io.File;
import java.io.IOException;

public class CapabilityAudioRecorder extends CapabilitieTask {
    private static MediaRecorder recorderInstance;
    private static File outputFile;

    public CapabilityAudioRecorder() {
        capabilitiekNames = new String[]{"startAudioRecord", "stopAudioRecord"};
        requiredPermissions = new String[]{Manifest.permission.RECORD_AUDIO};
        //JSON_LD = "placeholder";
    }

    public static void startAudioRecord(NativeRequest req) throws IOException {
        boolean started = startRecorder(req);
        if (!started) {
            new NativeResponse(req).sendError("Fehler: audioaufnahme bereits gestartet!");
            return;
        }
        int duration = req.getArgs().optInt(1, -1) * 1000;

        if (duration < 0) {
            new NativeResponse(req).send();
        } else {
            new Handler(Looper.getMainLooper()).postDelayed(() -> stopAudioRecord(req), duration);    //todo: @BA NativeRequest Forwarding
        }
    }

    public static void stopAudioRecord(NativeRequest req) {
        File outputFile = stopRecorder();
        if (outputFile == null) {
            new NativeResponse(req).sendError("Fehler! Keine Aufnahme aktiv!");
            return;
        }
        // send file to Univ
        new NativeResponse(req).send(outputFile, NativeResponse.FileCodec.ACC);
    }

    //audio Recorder
    public static boolean startRecorder(NativeRequest req) throws IOException {
        if (recorderInstance != null)
            return false;

        recorderInstance = new MediaRecorder();

        recorderInstance.setAudioSource(MediaRecorder.AudioSource.MIC);
        recorderInstance.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);

        outputFile = FileIO.createFile("Audio", req.getTaskID() + ".acc", req.getContext());

        recorderInstance.setOutputFile(outputFile.getAbsolutePath());
        recorderInstance.setAudioEncoder(MediaRecorder.AudioEncoder.DEFAULT);
        recorderInstance.prepare();
        recorderInstance.start();

        return true;
    }

    public static File stopRecorder() {
        MediaRecorder rec;
        if (recorderInstance == null)
            return null;

        rec = recorderInstance;
        recorderInstance = null;
        rec.stop();
        rec.release();
        return outputFile;
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getArgs().getString(0)) {
            case "startAudioRecord":
                startAudioRecord(req);
                break;
            case "stopAudioRecord":
                stopAudioRecord(req);
                break;
        }
    }
}
