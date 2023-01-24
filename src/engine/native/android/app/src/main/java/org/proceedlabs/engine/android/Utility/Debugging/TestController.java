package org.proceedlabs.engine.android.Utility.Debugging;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.proceedlabs.engine.android.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.Timer;
import java.util.TimerTask;

public class TestController {
    private static TestController instance;
    MainActivity context;

    /*
     * Used to create test IPSc
     * this class is created, once the webView hat finished laoding
     *
     * */
    private TestController(MainActivity context) {
        this.context = context;

        try {
            startTests();
        } catch (JSONException e) {
            //Logging.log("Fehlerhafter Test Case",e.getMessage(),true,context);
        }
    }

    public static synchronized void startTests(MainActivity context) {
        if (instance == null) {
            instance = new TestController(context);

        }
    }

    public static boolean addTest(TaskNames taskName, JSONArray args, long intervallS, int iterations) {
        if (instance == null) return false;

        instance.test(taskName, args, intervallS, iterations);
        return true;
    }


    /*
    * uncomment lines to start a test IPC
    * */
    private void startTests() throws JSONException {
        TaskNames taskname;


        taskname = TaskNames.setport;
        // test(taskname, new JSONArray().put(33029),1,1);


        taskname = TaskNames.read;
        //test(taskname, new JSONArray().put("logging/log"),1,1);
        //test(taskname, new JSONArray().put("logging/log2"),1,1);

        taskname = TaskNames.write;
        //test(taskname, new JSONArray().put("logging"),2,1);
        //test(taskname, new JSONArray().put("logging/log2").put("das hier ist mein zweiter LOG"),2,1);


        taskname = TaskNames.read_config;
        //test(taskname,new JSONArray(), 5,0);

        taskname = TaskNames.write_config;
        //test(taskname,new JSONArray().put(new JSONObject().put("description","descriptiondescription")).put(true),1,1);
        //test(taskname,new JSONArray().put(new JSONObject().put("name","2")).put(false),3,1);


        taskname = TaskNames.publish;
        //test(taskname, new JSONArray().put("Note8").put(33029).put(new JSONObject().put("id","dev_ID2").put("hostname","devHostName").put("currentlyConnectedEnvironments", new JSONArray())), 1, 1);

        taskname = TaskNames.unpublish;
        //test(taskname,new JSONArray(), 30,1);

        taskname = TaskNames.discover;
        //test(taskname, new JSONArray(),10,10);


        taskname = TaskNames.performcapabilitie;  //audio Playback

        //audio Playback
        //test(taskname, new JSONArray().put("startAudioPlayback").put("https://ondemand-mp3.dradio.de/file/dradio/2020/04/17/podcast_coronavirus_alltag_einer_pandemie_folge_18_dlf_20200417_1600_c59d2c29.mp3"), 1, 1);
        //test(taskname, new JSONArray().put("stopAudioPlayback"), 5, 1);

        //audio Record
        //test(taskname, new JSONArray().put("startAudioRecord"), 1, 1);
        //test(taskname, new JSONArray().put("stopAudioRecord"), 5, 1);

        //audio Record (fixed length)
        //test(taskname, new JSONArray().put("startAudioRecord").put(5), 1, 1);


        //user Photo (max Size)
        //test(taskname, new JSONArray().put("takeUserPhoto").put(1000), 1, 1);


        //user Photo
        //test(taskname, new JSONArray().put("takeUserPhoto"), 1, 1);


        //silent Photo
        //test(taskname, new JSONArray().put("takeSilentPhoto").put(1000), 5, 10);


        //NFC scanner (all)
        //test(taskname, new JSONArray().put("startNFCscanner"), 1, 1);
        //test(taskname, new JSONArray().put("stopNFCscanner"), 20, 1);

        //NFC scanner (for ID)
        //test(taskname, new JSONArray().put("scannForNFCtag").put("E03D2F83"), 1, 1);


        //getUserLocation
        //test(taskname, new JSONArray().put("getUserLocation"), 5, 50);

        taskname = TaskNames.read_device_info;
       /*
        test(taskname,new JSONArray().put(new JSONArray().put("battery")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("cpu")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("disk")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("display")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("hostname")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("id")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("inputs")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("mem")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("network")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("os")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("outputs")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("wifi")),1,1);
        test(taskname,new JSONArray().put(new JSONArray().put("battery").put("cpu").put("disk").put("display").put("hostname").put("id").put("inputs").put("mem").put("network").put("os").put("outputs").put("wifi")),1,1);
        */
    }

    private void test(TaskNames taskName, JSONArray args, long intervallS, int iterations) {
        intervallS = intervallS * 1000;
        JSONArray obj = new JSONArray();
        obj.put("simulatedTask" + Math.random());
        obj.put(taskName.toString());
        obj.put(args);

        if (iterations == 1)    //iterations = 0 means infinite
            new Handler(Looper.getMainLooper()).postDelayed(() -> context.wvInstance.postToNative(obj.toString()), intervallS);
        else {
            Timer timer = new Timer();

            TimerTask task = new TimerTask() {
                int iterationCounter = 0;

                @Override
                public void run() {
                    new Handler(Looper.getMainLooper()).post(() -> context.wvInstance.postToNative(obj.toString()));
                    Log.i("simulateIPC", "send simulateIPC + iteration:" + iterationCounter + 1 + " of " + iterations + "  msg:" + obj.toString());
                    iterationCounter++;
                    if (iterationCounter == iterations)
                        timer.cancel();
                }
            };
            timer.scheduleAtFixedRate(task, 0, intervallS);
        }
    }


    public enum TaskNames {read_config, write_config, read_device_info, read, write, console_log, publish, discover, unpublish, serve, respond, setport, unsetport, performcapabilitie, allcapabilities, writenative, readnative, lsnative, writevirtual, readvirtual, lsvirtual}               //serve, respond, read, write, discover, capability
}
