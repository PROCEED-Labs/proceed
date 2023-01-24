//
//  ViewController.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 30.03.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import UIKit
import WebKit

class ViewController: UIViewController, WKScriptMessageHandler, NativeMessageHandler {
    var webView: WKWebView!
    let native = Native()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        native.delegate = self
        
        // TODO: remove once persistent storage / capabilities implemented
        native.data.write(args: ["capabilities/names", "[\"has-screen\", \"get-location\"]"])
        
        let ucc = WKUserContentController()
        ucc.add(self, name: "send")
        
        let config = WKWebViewConfiguration()
        config.userContentController = ucc
        
        webView = WKWebView(frame: view.frame, configuration: config)
        view.addSubview(webView)
        
        let universalPath = Bundle.main.url(forResource: "index", withExtension: "html")!
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0, execute: {
            self.webView.loadFileURL(universalPath, allowingReadAccessTo: universalPath)
        })
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        native.onMessage(message: message.body)
    }
    
    func emit(_ message: [Any]) {
        let json = try! JSONSerialization.data(
            withJSONObject: message,
            options: [])
        let jsonString = String(data: json, encoding: .utf8)!
        let js = "window.ipcReceive(\(jsonString));"
//        print(js)
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

