//
//  HTTP.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 31.03.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation
import Embassy

struct Route {
    let method: String
    let path: String
    let options: [String: Any]?
    let callback: Callback
}

private let mimeTypes = [
    "json": "application/json",
    "html": "text/html",
    "css": "text/css",
    "plain": "text/plain",
    "javascript": "text/javascript",
    "jsonld": "application/ld+json"
]

class HTTP {
    private var routes = [Route]()
    private var responses = [TaskID: (
        [String: Any],
        ((String, [(String, String)]) -> Void),
        ((Data) -> Void)
    )]()
    private var server: DefaultHTTPServer!
    var delegate: NativeMessageHandler!
    
    func setPort(args: [Any]) {
        let port = args[0] as! Int
        
        // Start the server
        let loop = try! SelectorEventLoop(selector: try! KqueueSelector())
        server = DefaultHTTPServer(eventLoop: loop, interface: "::", port: port, app: self.requestHandler)
        //server.logger.add(handler: PrintLogHandler())
        
        // Run the event loop
        DispatchQueue.global().async {
            try! self.server.start()
            loop.runForever()
        }
    }
    
    private func requestHandler(
        environ: [String: Any],
        startResponse: @escaping ((String, [(String, String)]) -> Void),
        sendBody: @escaping ((Data) -> Void)
        ) {
        let reqPath = environ["PATH_INFO"]! as! String
        let reqHostname = environ["HTTP_HOST"] as! String
        let reqMethod = environ["REQUEST_METHOD"] as! String
        
        // Check if CORS enabled
        if reqMethod == "OPTIONS" {
            let route = routes.first { (route) -> Bool in
                if matchPathWithRoute(path: reqPath, route: route) != nil,
                    let options = route.options {
                    if options["cors"] as? Int == 1 {
                        return true
                    }
                }
                return false
            }
            if route != nil {
                startResponse("200", [
                    ("Access-Control-Allow-Origin", "*"),
                    ("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE"),
                    ("Access-Control-Allow-Headers", "content-type"),
                    ("Vary", "Access-Control-Request-Headers")
                    ])
                sendBody(Data())
                return
            }
        }
        
        // Check if we have a route registered
        guard let (route, params) = routeForPath(reqPath, method: reqMethod.lowercased()) else {
            // No route registered - 404
            startResponse("404 NOT FOUND", [("Access-Control-Allow-Origin", "*")])
            // send EOF
            sendBody(Data())
            return
        }
        
        // Check if a body is present
        let input = environ["swsgi.input"] as! SWSGIInput
        var body = Data()
        
        func createResObject() {
            let jsonBody = !body.isEmpty ? try? JSONSerialization.jsonObject(with: body, options: []) : nil
            
            let res = [
                "hostname": reqHostname,
                "method": route.method,
                "params": params,
                "path": reqPath,
                "body": body.isEmpty ? [:] : jsonBody!,
                ] as [String : Any?]
            
            let resID = UUID().uuidString
            
            // Store the response methods
            self.responses[resID] = (environ, startResponse, sendBody)
            
            route.callback(nil, resID, res)
        }
        
        if environ["HTTP_CONTENT_LENGTH"] == nil {
            createResObject()
            return
        }
        
        input { (data) in
            if data.isEmpty {
                // EOF
                createResObject()
                return
            }
            body += data
        }
    }
    
    private func routeForPath(_ path: String, method: String) -> (Route, [String: String])? {
        for route in routes {
            if route.method != method {
                continue
            }
            
            if let namedParams = matchPathWithRoute(path: path, route: route) {
                return (route, namedParams)
            }
        }
        return nil
    }
    
    private func matchPathWithRoute(path: String, route: Route) -> [String: String]? {
        // Find all named params in the route path
        let namedParamsRegEx = try! NSRegularExpression(pattern: ":[^\\/]*")
        
        // Replace named params with reg ex for matching with the given path
        let routePath = "^" +
            namedParamsRegEx.stringByReplacingMatches(
                in: route.path,
                range: NSRange(location: 0, length: route.path.count),
                withTemplate: "([^/]+)"
                ).replacingOccurrences(of: "/", with: "\\/") +
        "$"
        
        
        // Match the newly created reg ex with the given path
        let pathRegEx = try! NSRegularExpression(pattern: routePath)
        if pathRegEx.numberOfMatches(in: path, options: [], range: NSRange(location: 0, length: path.count)) > 0 {
            // Path matches route, so we now need to assign the named params with the given path values
            // Get the named params of the route path
            let namedParams = namedParamsRegEx.matches(in: route.path, range: NSRange(location: 0, length: route.path.count))
            // Get the capture groups of the given path (those are the named params of the route)
            let matches = pathRegEx.matches(in: path, options: [], range: NSRange(location: 0, length: path.count))[0]
            
            var paramsDict = [String: String]()
            // Create the named params - path values dictionary
            for namedParamResult in namedParams {
                var range = namedParamResult.range(at: 0)
                var lowerBound = route.path.index(route.path.startIndex, offsetBy: range.lowerBound + 1)
                var upperBound = route.path.index(route.path.startIndex, offsetBy: range.upperBound)
                let namedParam = String(route.path[lowerBound..<upperBound])
                
                range = matches.range(at: namedParams.firstIndex(of: namedParamResult)! + 1)
                lowerBound = path.index(path.startIndex, offsetBy: range.lowerBound)
                upperBound = path.index(path.startIndex, offsetBy: range.upperBound)
                let pathParam = String(path[lowerBound..<upperBound])
                
                paramsDict[namedParam] = pathParam
            }
            
            return paramsDict
        }
        
        return nil
    }
    
    func serve(args: [Any], callback: @escaping Callback) {
        let method = args[0] as! String
        let path = args[1] as! String
        let options = args.count > 2 ? args[2] as? [String: Any] : nil
        let route = Route(method: method, path: path, options: options, callback: callback)
        routes.append(route)
    }
    
    func respond(args: [Any]) {
        let response = args[0] as? String ?? ""
        let resID = args[1] as! TaskID
        let statusCode = args[2] as! Int
        let mimeType = mimeTypes[args[3] as? String ?? "json"]!
        let (_, startResponse, sendBody) = responses[resID]!
        startResponse("\(statusCode)", [("Access-Control-Allow-Origin", "*"), ("Content-Type", "\(mimeType); charset=utf8")])
        sendBody(Data(response.utf8))
        sendBody(Data())
        responses.removeValue(forKey: resID)
    }
}
