package org.proceedlabs.engine.android.NativeAPI.Capabilities;

import android.content.Context;
import android.media.AudioManager;
import android.media.MediaPlayer;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.CapabilitieTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;
import org.proceedlabs.engine.android.FormatAPI.NativeResponse;
import org.proceedlabs.engine.android.Utility.Base64Util;

import org.json.JSONException;

import java.io.File;
import java.io.IOException;

public class CapabilityAudioPlayer extends CapabilitieTask {
    MediaPlayer mPlayer;

    public CapabilityAudioPlayer() {
        capabilitiekNames = new String[]{"startAudioPlayback", "stopAudioPlayback"};
        JSON_LD = null;
    }

    @Override
    public void handle(NativeRequest req) throws JSONException, IOException {
        switch (req.getArgs().getString(0)) {
            case "startAudioPlayback":
                startAudioPlayback(req);
                break;
            case "stopAudioPlayback":
                stopAudioPlayback(req);
                break;
        }
    }

    public synchronized void stopAudioPlayback(NativeRequest req) {
        try {
            stopPlayer();
        } catch (RuntimeException e) {
            new NativeResponse(req).sendError("Error! Player may Already stopped:" + e.getMessage());
        }
        new NativeResponse(req).send();
    }

    public synchronized void startAudioPlayback(NativeRequest req) throws JSONException, IOException {
        if (mPlayer != null) {
            new NativeResponse(req).sendError("already playing ");
            return;
        }
        if (getCurrentMediaAudioLevel(req.getContext()) == 0)
            new NativeResponse(req).sendError("The Mashines media Audio Level is set to zero. The user might not notice the audio being played.");

        startPlayer(req);
    }

    /*
        This function sets the media volume to a specified lower-bound-level, if it was below that lvl.

        use this in future to enusre an minimun audio Level
     */
    private void ensureVolume(NativeRequest req) {
        AudioManager audio = (AudioManager) req.getContext().getSystemService(Context.AUDIO_SERVICE);
        int currentVolume = audio.getStreamVolume(AudioManager.STREAM_MUSIC);
        int maxVolume = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        float percent = 0.2f;       //extract this param from the NativeRequest as min Volume
        int minVolume = (int) (maxVolume * percent);
        if (currentVolume < minVolume)
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, minVolume, 0);
    }

    private int getCurrentMediaAudioLevel(Context c) {
        AudioManager audio = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        return audio.getStreamVolume(AudioManager.STREAM_MUSIC);
    }

    //Media Player
    void startPlayer(NativeRequest req) throws JSONException, IOException {
        String url;

        if (req.getArgs().optString(2).equals("")) {
            url = req.getArgs().optString(1);
        } else {
            String fileName = req.getArgs().getString(1);
            String bas64 = req.getArgs().getString(2);

            File mediaFile = Base64Util.decoderBase64FileWithFileName(bas64, fileName, req.getContext());
            url = mediaFile.getAbsolutePath();
        }

        mPlayer = new MediaPlayer();
        mPlayer.setDataSource(url);
        mPlayer.prepare();
        mPlayer.setOnCompletionListener((player) -> {
            new NativeResponse(req).send();
            mPlayer.release();
            mPlayer = null;
        });
        mPlayer.start();
    }

    void stopPlayer() throws IllegalStateException, NullPointerException {
        mPlayer.stop();
        mPlayer.release();
        mPlayer = null;
    }
}
