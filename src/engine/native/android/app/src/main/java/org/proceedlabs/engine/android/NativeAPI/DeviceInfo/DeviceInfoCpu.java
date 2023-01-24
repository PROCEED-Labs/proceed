package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.util.regex.Pattern;

/*
 * Thanks to:
 * https://stackoverflow.com/questions/56779662/how-to-get-cpu-usage-programmatically-with-the-cores-frequency
 *
 */

public class DeviceInfoCpu extends DeviceInfoTask {
    private int sLastCpuCoreCount = -1;

    public DeviceInfoCpu() {
        deviceInfoName = "cpu";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("cores", calcCpuCoreCount());
        json.put("currentSpeed", calcCurrentSpeed());
        json.put("speed", calcMaxSpeed());
        json.put("currentLoad", calcCurrentLoad()); //todo: currSpeed!

        /*
         * you may want to hard-code these values in future
         * */
        //json.put("physicalCores", calcCpuCoreCount());
        //json.put("processors", 1);


        resp.put(deviceInfoName, json);
    }

    private int calcCurrentSpeed() {
        int speedSum = 0;
        for (int i = 0; i < calcCpuCoreCount(); i++) {
            speedSum += takeCurrentCpuFreq(i);
        }
        return speedSum / calcCpuCoreCount();
    }

    private int calcMaxSpeed() {
        int maxSpeed = 0;
        for (int i = 0; i < calcCpuCoreCount(); i++) {
            int speed = readIntegerFile("/sys/devices/system/cpu/cpu" + i + "/cpufreq/scaling_max_freq");
            if (speed > maxSpeed) maxSpeed = speed;
        }
        return maxSpeed;
    }

    private double calcCurrentLoad() {
        int loadSum = 0;
        for (int i = 0; i < calcCpuCoreCount(); i++) {
            loadSum += readIntegerFile("/sys/devices/system/cpu/cpu0/rq-stats/cpu_normalized_load");    // not working, returns 0
        }
        return loadSum / calcCpuCoreCount() * 100;
    }

    private int readIntegerFile(String filePath) {

        try {
            final BufferedReader reader = new BufferedReader(
                    new InputStreamReader(new FileInputStream(filePath)), 1000);
            final String line = reader.readLine();
            reader.close();

            return Integer.parseInt(line);
        } catch (Exception e) {
            return 0;
        }
    }

    private int takeCurrentCpuFreq(int coreIndex) {
        return readIntegerFile("/sys/devices/system/cpu/cpu" + coreIndex + "/cpufreq/scaling_cur_freq");
    }

    public int calcCpuCoreCount() {

        if (sLastCpuCoreCount >= 1) {
            return sLastCpuCoreCount;
        }

        try {
            // Get directory containing CPU info
            final File dir = new File("/sys/devices/system/cpu/");
            // Filter to only list the devices we care about
            final File[] files = dir.listFiles(new FileFilter() {

                public boolean accept(File pathname) {
                    //Check if filename is "cpu", followed by a single digit number
                    if (Pattern.matches("cpu[0-9]", pathname.getName())) {
                        return true;
                    }
                    return false;
                }
            });

            // Return the number of cores (virtual CPU devices)
            sLastCpuCoreCount = files.length;

        } catch (Exception e) {
            sLastCpuCoreCount = Runtime.getRuntime().availableProcessors();
        }

        return sLastCpuCoreCount;
    }
}
