//
//  Configuration.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 25.07.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation

// NOTE: We have to store infinity for all "null" values in JSON because we cannot store it directly in the UserDefaults instance. Due to infinity being not allowed as a number value in JSON, we can replace it with it as a placeholder.
let CONFIG_DEFAULTS = [
      "name": "",
      "description": "",
      "logs": [
        "enabled": true,
        "logLevel": "info",
        "forwardToConsole": true,
        "consoleLevel": "info",
        "maxProcessLogEntries": 500,
        "maxProcessLogTables": 5,
        "rotationInterval": 600,
        "maxStandardLogEntries": 1000
      ],
      "processes": [
        "acceptUserTasks": false,
        "deactivateProcessExecution": false
      ],
      "engine": [
        "networkRequestTimeout": 10,
        "loadInterval": 10,
        "discoveryInterval": 10
      ],
      "machine": [
        "port": 33029,
        "classes": [],
        "domains": [],
        "inputs": [],
        "outputs": [],
        "onlineCheckingAddresses": ["clients3.google.com", "1.1.1.1"],
        "currentlyConnectedEnvironments": []
      ]
] as [String : Any]


class Configuration {
    init() {
        // Store all default config values if they aren't set already.
        let defaults = UserDefaults.standard
        let storedConfig = defaults.dictionary(forKey: "PROCEED") ?? [:]
        let config = setIfKeyNotPresent(dict: storedConfig, defaults: CONFIG_DEFAULTS)
        defaults.set(config, forKey: "PROCEED")
    }
    
    private func setIfKeyNotPresent(dict: [String: Any], defaults: [String: Any]) -> [String: Any] {
        var newDict = [String: Any]()
        for (key, value) in defaults {
            if dict.index(forKey: key) == nil {
                newDict[key] = value
            } else if let value = value as? [String: Any] {
                // Since the key exists on dict (was set already) we assume that it is a dict as well.
                // If not, that would break the system in place since we cannot mix dicts and primitives.
                assert(dict[key] as? [String: Any] != nil)
                newDict[key] = setIfKeyNotPresent(dict: dict[key] as! [String: Any], defaults: value)
            } else {
                newDict[key] = dict[key]
            }
        }
        return newDict
    }
    
    func readConfig() -> [String: Any?] {
        let defaults = UserDefaults.standard
        let dict: [String : Any] = defaults.dictionary(forKey: "PROCEED") ?? [:]
        // Convert Infinity values to nil
        return convertInfToNil(dict: dict)
    }
    
    private func convertInfToNil(dict: [String: Any]) -> [String: Any?] {
        return dict.mapValues { (value) -> Any? in
            if let value = value as? NSNumber, value == kCFNumberPositiveInfinity {
                return nil
            } else if let value = value as? [String: Any] {
                return convertInfToNil(dict: value)
            }
            return value
        }
    }
    
    private func convertNilToInf(value: Any?) -> Any {
        if value == nil {
            return kCFNumberPositiveInfinity!
        } else if let value = value as? [String: Any?] {
            return value.mapValues { (val) -> Any in
                return convertNilToInf(value: val)
            }
        }
        return value!
    }
    
    private func merge(dict: [String: Any], newDict: [String: Any]) -> [String: Any] {
        return dict.merging(newDict) { (current, new) -> Any in
            if let current = current as? [String: Any] {
                assert(new as? [String: Any] != nil)
                return merge(dict: current, newDict: new as! [String: Any])
            } else {
                return new
            }
        }
    }
    
    func writeConfig(args: [Any?]) -> [String: Any?] {
        let configObj = (args[0] as! [String: Any?]).mapValues({ convertNilToInf(value: $0) })
        let overwrite = args[1] as? Bool ?? false
        let defaults = UserDefaults.standard
        var dict = defaults.dictionary(forKey: "PROCEED") ?? [:]
        
        if (overwrite) {
            // The new configObj is the whole custom config, so just fill up the missing defaults
            dict = setIfKeyNotPresent(dict: configObj, defaults: CONFIG_DEFAULTS)
        } else {
            dict = merge(dict: dict, newDict: configObj)
        }

        defaults.set(dict, forKey: "PROCEED")
        return convertInfToNil(dict: dict)
    }
}
