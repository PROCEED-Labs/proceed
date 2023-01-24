//
//  Machine.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 11.02.20.
//  Copyright © 2020 Kai Rohwer. All rights reserved.
//

import Foundation
import UIKit
import PlainPing

let ONLINE_ADRESSES = ["1.1.1.1"]

class Machine {
    
    func readDeviceInfo(args: [Any], _ callback: @escaping ([String: Any]) -> ()) {
        let properties = args[0] as! [String]
        var deviceInfo = [String: Any]()
        
        // Semaphore?
        var waiting = false
        var queued = 0
        
        func done() {
            queued -= 1
            if waiting && queued == 0 {
                callback(deviceInfo)
            }
        }
        
        if properties.contains("hostname") {
            deviceInfo["hostname"] = ProcessInfo.processInfo.hostName
        }
        if properties.contains("id") {
            deviceInfo["id"] = UIDevice.current.identifierForVendor?.uuidString;
        }
        if properties.contains("online") {
            queued += 1
            let startedPings = ONLINE_ADRESSES.count
            var finished = 0

            for address in ONLINE_ADRESSES {
                PlainPing.ping(address, withTimeout: 1.0, completionBlock: { (timeElapsed:Double?, error:Error?) in
                    finished += 1
                    if (finished == startedPings) {
                        deviceInfo["online"] = true;
                        done();
                    }
                    if let latency = timeElapsed {
                        print("\(address) latency (ms): \(latency)")
                    }
                    if let error = error {
                        print("error: \(error.localizedDescription)")
                        deviceInfo["online"] = false;
                        finished = ONLINE_ADRESSES.count
                        done()
                    }
                })
            }
        }
        if (properties.contains("os")) {
          deviceInfo["os"] = [
            "platform": UIDevice.current.name,
            "distro": UIDevice.current.systemName,
            "release": UIDevice.current.systemVersion,
          ]
        }
        if (properties.contains("cpu")) {
          deviceInfo["cpu"] = [
            "cores": System.logicalCores(),
            "physicalCores": System.physicalCores(),
            "processors": 1,
            //speed: cpu.speed,
            "currentLoad": System.loadAverage(.short)[0],
          ];
        }
        if (properties.contains("mem")) {
            let VM_STATS_COUNT = mach_msg_type_number_t(MemoryLayout<vm_statistics_data_t>.size/MemoryLayout<natural_t>.size)
            var info = vm_statistics_data_t()
            var count = VM_STATS_COUNT

            let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
                $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                    host_statistics(mach_host_self(),
                              HOST_VM_INFO,
                              $0,
                              &count)
                }
            }
            
            if kerr != KERN_SUCCESS {
                print("Error with host_statistics(): " +
                    (String(cString: mach_error_string(kerr), encoding: String.Encoding.ascii) ?? "unknown error"))
            }
            
            let total = ProcessInfo.processInfo.physicalMemory
            
            deviceInfo["mem"] = [
                "total": total,
                "free": Int(info.free_count) * Int(vm_page_size),
                "load": (Double(total) - Double(info.free_count) * Double(vm_page_size)) / Double(total)
            ]
        }
        if (properties.contains("disk")) {
            let fsAttributes = try! FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
            deviceInfo["disk"] = [
                "type": "SSD",
                "total": fsAttributes[FileAttributeKey.systemSize],
                "free": fsAttributes[FileAttributeKey.systemFreeSize],
                "used": Int(fsAttributes[FileAttributeKey.systemSize] as! Int) - Int(fsAttributes[FileAttributeKey.systemFreeSize] as! Int),
            ]
        }
        if (properties.contains("battery")) {
            let device = UIDevice.current
            device.isBatteryMonitoringEnabled = true
            
            deviceInfo["battery"] = [
                "hasBattery": true,
                "percent": device.batteryLevel,
                "isCharging": device.batteryState == UIDevice.BatteryState.charging
            ]
        }
        if (properties.contains("display")) {
            let bounds = UIScreen.main.fixedCoordinateSpace.bounds
            deviceInfo["display"] = [
                [ "currentResX": bounds.width, "currentResY": bounds.height ]
            ]
        }
        if (properties.contains("network")) {
            var networkArr = [[String: Any?]]()
            
            // Add wifi interface if connected
            if (SSNetworkInfo.connectedToWiFi()) {
                networkArr.append([
                    "type": "wireless",
                    "ip4": SSNetworkInfo.wiFiIPAddress(),
                    "ip6": SSNetworkInfo.wiFiIPv6Address(),
                    "netmaskv4": SSNetworkInfo.wiFiNetmaskAddress(),
                    "netmaskv6": nil
                ])
            }
            // Add cell interface if connected
            else if (SSNetworkInfo.connectedToCellNetwork()) {
                networkArr.append([
                    "type": "cellular",
                    "ip4": SSNetworkInfo.cellIPAddress(),
                    "ip6": SSNetworkInfo.cellIPv6Address(),
                    "netmaskv4": SSNetworkInfo.cellNetmaskAddress(),
                    "netmaskv6": nil
                ])
            }
            
            deviceInfo["network"] = networkArr
        }
        if (properties.contains("outputs")) {
          deviceInfo["outputs"] = ["Screen", "Speaker"];
        }
        if (properties.contains("inputs")) {
            deviceInfo["inputs"] = ["Keyboard", "Numpad", "Microphone", "Touchscreen"]
        }
        
        waiting = true
        if (queued == 0) {
            callback(deviceInfo)
        }
    }
}
