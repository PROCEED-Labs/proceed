//
//  Native.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 30.03.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation

typealias TaskID = String
typealias Callback = (_ error: String?, _ value: Any?...) -> Void

protocol NativeMessageHandler {
    func emit(_ message: [Any])
}

class Native: NativeMessageHandler {
    var delegate: NativeMessageHandler!
    let http = HTTP()
    let data = NativeData()
    let discovery = Discovery()
    let capabilities = Capabilities()
    let configuration = Configuration()
    let machine = Machine()
    
    init() {
        self.http.delegate = self
    }
    
    func onMessage(message: Any) {
        let messageArr = message as! [Any]
        let taskID = messageArr[0] as! TaskID
        let taskName = messageArr[1] as! String
        let args = messageArr[2] as? [Any]
                
        // callback function for this task
        let callback: Callback = { (error, value: Any?...) in
            
            self.emit([taskID, [error] + value])
        }
        
        if taskName == "serve" {
            http.serve(args: args!, callback: callback)
        } else if taskName == "setPort" {
            http.setPort(args: args!)
            // Note, we don't check for server success since it is force-try'ed
            emit([taskID, [nil]])
        } else if taskName == "respond" {
            http.respond(args: args!)
        } else if taskName == "read" {
            let (error, value) = data.read(args: args!)
            emit([taskID, [error, value]])
        } else if taskName == "write" {
            let error = data.write(args: args!)
            emit([taskID, [error]])
        } else if taskName == "publish" {
            discovery.publish(args: args!) { (err) in
                self.emit([taskID, [err]])
            }
        } else if taskName == "discover" {
            discovery.find { services in
                self.emit([taskID, [nil, services]])
            }
        } else if taskName == "capability" {
            capabilities.handleCapabilityTask(args: args!, callback: callback)
        } else if taskName == "allCapabilities" {
            let value = capabilities.getAll()
            emit([taskID, [nil, value]])
        } else if taskName == "read_config" {
            let value = configuration.readConfig()
            emit([taskID, [nil, value]])
        } else if taskName == "write_config" {
            let value = configuration.writeConfig(args: args!)
            emit([taskID, [nil, value]])
        } else if taskName == "read_device_info" {
            machine.readDeviceInfo(args: args!) { (value) in
                self.emit([taskID, [nil, value]])
            }
        } else if taskName == "console_log" {
            // Don't need a class for this
            let message = args![0]
            print(message)
            emit([taskID, [nil]])
        } else {
            print(taskID, taskName, args)
        }
    }
    
    func emit(_ message: [Any]) {
        delegate.emit(message)
    }
}
