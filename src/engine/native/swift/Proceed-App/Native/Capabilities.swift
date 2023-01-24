//
//  Capabilities.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 29.04.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation
import CoreLocation

class Capabilities: NSObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private var callbacks = [Callback]()
    
    override init() {
        super.init()
        locationManager.requestAlwaysAuthorization()
        locationManager.delegate = self
    }
    
    func getAll() -> [Any] {
        return []
    }
    
    func handleCapabilityTask(args: [Any], callback: @escaping Callback) {
        let description = args[0] as! String
        let taskArgs = args[1] as! [Any]
        
        if description == "get-location" {
            getLocation(callback: callback)
        }
    }
    
    private func getLocation(callback: @escaping Callback) {
        callbacks.append(callback)
        locationManager.requestLocation()
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let lat = locations.last!.coordinate.latitude
        let long = locations.last!.coordinate.longitude
        
        callbacks.forEach { (callback) in
            callback(nil, [lat, long])
        }
        callbacks = []
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print(error)
        
        callbacks.forEach { (callback) in
            callback(error.localizedDescription, nil)
        }
        callbacks = []
    }
}
