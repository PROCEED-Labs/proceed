package org.proceedlabs.engine.android.NativeAPI.DeviceInfo;

import android.util.Log;

import org.proceedlabs.engine.android.FormatAPI.Interfaces.DeviceInfoTask;
import org.proceedlabs.engine.android.FormatAPI.NativeRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.List;

public class DeviceInfoNetwork extends DeviceInfoTask {
    public DeviceInfoNetwork() {
        deviceInfoName = "network";
    }

    public void handle(NativeRequest req, JSONObject resp) throws JSONException {
        JSONArray arr = new JSONArray();

        //https://stackoverflow.com/questions/6064510/how-to-get-ip-address-of-the-device-from-code
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            outerloop:
            for (NetworkInterface intf : interfaces) {
                JSONObject json = new JSONObject();

                //get mac Adress
                byte[] mac = intf.getHardwareAddress();
                String macAdress = "";
                if (mac != null) {
                    StringBuilder buf = new StringBuilder();
                    for (byte aMac : mac) buf.append(String.format("%02X:", aMac));
                    if (buf.length() > 0) buf.deleteCharAt(buf.length() - 1);
                    macAdress = buf.toString();
                }
                if (!macAdress.equals(""))
                    json.put("mac", macAdress);

                // get Network type
                String type = "wireless";
                if (intf.getName().contains("rmnet"))
                    type = "cellular";
                if (intf.getName().contains("eth"))
                    type = "wired";
                if (intf.getName().contains("wlan"))
                    type = "wireless";
                if (intf.getName().contains("p2p"))
                    continue;
                if (intf.getName().contains("dummy"))
                    continue;

                json.put("type", type);

                //get IP and Subnet Mask
                for (InterfaceAddress interfaceAddress : intf.getInterfaceAddresses()) {
                    InetAddress adress = interfaceAddress.getAddress();

                    String sAddr = adress.getHostAddress();
                    if (adress.isLoopbackAddress())
                        continue outerloop;

                    boolean isIPv4 = sAddr.indexOf(':') < 0;
                    int delim = sAddr.indexOf('%');
                    String ip = isIPv4 ? sAddr : (delim < 0 ? sAddr.toUpperCase() : sAddr.substring(0, delim).toUpperCase());
                    json.put(isIPv4 ? "ip4" : "ip6", ip);


                    InetAddress localHost = Inet4Address.getLocalHost();
                    NetworkInterface networkInterface = NetworkInterface.getByInetAddress(localHost);
                    networkInterface.getInterfaceAddresses().get(0).getNetworkPrefixLength();

                    short networkPrefixLength = interfaceAddress.getNetworkPrefixLength();
                    json.put(isIPv4 ? "netmaskv4" : "netmaskv6", getSubnet(networkPrefixLength, isIPv4));

                }

                if (json.length() > 1)  //ignore empty interfaces
                    arr.put(json);

            }
        } catch (Exception ex) {
            Log.i("ERROR Network Info", "hmm");
            ex.printStackTrace();
        }
        resp.put(deviceInfoName, arr);

    }

    private String getSubnet(int len, boolean ipv4) {
        int byteSize = ipv4 ? 4 : 16;

        int[] byteArr = new int[byteSize];
        for (int i = 0; i < byteArr.length; i++) {
            int b = 0;
            for (int j = 0; j < 8; j++)
                if (8 * i + j < len)   //>=??
                    b += Math.pow(2, 7 - j);
            byteArr[i] = b;
        }
        if (ipv4) {
            StringBuilder s = new StringBuilder();
            for (int b : byteArr) {
                s.append(b);
                s.append(".");
            }
            s.deleteCharAt(s.length() - 1);
            return s.toString();
        } else {
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < 8; i++) {     //8 Blocks
                int block = 0;
                for (int j = 0; j < 16; j++) {    //16 bits{
                    if (8 * i + j < len)   //>=??
                        block += Math.pow(2, 15 - j);
                }
                s.append(Integer.toHexString(block));
                s.append(":");
            }
            s.deleteCharAt(s.length() - 1);
            return s.toString();
        }

    }
}
