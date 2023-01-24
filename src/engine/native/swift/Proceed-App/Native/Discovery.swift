//
//  Discovery.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 13.04.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation

typealias ServiceDict = [String: Any]
typealias DiscoveryCallback = (_ services: [ServiceDict]) -> ()

class Discovery: NSObject, NetServiceDelegate, NetServiceBrowserDelegate {
    private var service: NetService!
    private var browser: NetServiceBrowser!
    private var callbacks = [DiscoveryCallback]()
    private var foundServices = [ServiceDict]()
    private var resolvingServices = [NetService]()
    private var moreComing = true
    private var lastCallback: ((_ errorDict: Any?) -> ())? = nil
    
    func publish(args: [Any], _ callback: @escaping (_ errorDict: Any?) -> ()) {
        let hostname = args[0] as! String
        let port = args[1] as! Int
        let txt = args[2] as? [String: Any]
        lastCallback = callback
        let service = NetService(domain: "", type: "_proceed._tcp.", name: hostname, port: Int32(port))
        if let txt = txt {
            let data = NetService.data(fromTXTRecord: txt.mapValues({ try! JSONSerialization.data(withJSONObject: $0, options: [JSONSerialization.WritingOptions.fragmentsAllowed])}))
            service.setTXTRecord(data)
        }
        service.delegate = self
        service.includesPeerToPeer = true
        service.publish()
        self.service = service
    }
    
    func netServiceDidPublish(_ sender: NetService) {
        lastCallback!(nil)
    }
    
    func netService(_ sender: NetService, didNotPublish errorDict: [String : NSNumber]) {
        print(errorDict)
        lastCallback!(errorDict)
    }

    func find(_ callback: @escaping DiscoveryCallback) {
        // Store the callback for when the search finished
        callbacks.append(callback)
        
        // Ensure this is executed in the main thread
        DispatchQueue.main.async {
            let browser = NetServiceBrowser()
            browser.delegate = self
            browser.searchForServices(ofType: "_proceed._tcp.", inDomain: "")
            self.browser = browser
        }
    }
    
    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        // We found a service but we still need to resolve the addresses
        service.delegate = self
        service.resolve(withTimeout: .greatestFiniteMagnitude)
        
        // Store the reference so it doesn't get destroyed
        resolvingServices.append(service)
        
        self.moreComing = moreComing
    }
    
    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String : NSNumber]) {
        print(errorDict)
    }
    
    func netServiceDidResolveAddress(_ sender: NetService) {
        var ip = ""
        sender.addresses?.first!.withUnsafeBytes({ bytes in
            let socket = bytes.bindMemory(to: sockaddr.self)
            
            var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            getnameinfo(socket.baseAddress, socklen_t(sender.addresses!.first!.count), &hostname, socklen_t(hostname.count), nil, 0, NI_NUMERICHOST)
            ip = String(cString: hostname)
        })
        
        let serviceDict = [
            "ip": ip,
            "port": sender.port,
            ] as [String : Any]
        print(serviceDict)
        foundServices.append(serviceDict)

        resolvingServices.remove(at: resolvingServices.firstIndex(of: sender)!)
        
        // Check if this service was the last one
        if !moreComing && resolvingServices.isEmpty {
            callbacks.forEach { cb in
                cb(foundServices)
            }
            callbacks = []
        }
    }
}
