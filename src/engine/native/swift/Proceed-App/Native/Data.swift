//
//  Data.swift
//  Proceed-App
//
//  Created by Kai Rohwer on 07.04.19.
//  Copyright © 2019 Kai Rohwer. All rights reserved.
//

import Foundation
import SQLite

class NativeData {
    var _data = [String: [String: String]]()
    private let db: Connection
    private let keyColumn = Expression<String>("key")
    private let valueColumn = Expression<String>("value")
    
    init() {
        // Establish connection to sqlite database
        let path = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first!
        print(path)
        db = try! Connection("\(path)/db.sqlite3")
    }
    
    func read(args: [Any]) -> (error: String?, value: Any?) {
        let key = args[0] as! String
        
        let tableName: String
        if let index = key.firstIndex(of: "/") {
            tableName = String(key[key.startIndex..<index])
        } else {
            tableName = key
        }
        
        // Check if table exists
        let statement = try! db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        try! statement.run(tableName)
        
        if statement.makeIterator().next() != nil {
            let table = Table(tableName)

            if tableName != key {
                // ID is present
                let id = String(key[key.index(after: key.firstIndex(of: "/")!)...])
                
                let query = try! db.prepare(table.select(valueColumn).where(keyColumn == id))
                if let row = query.makeIterator().next() {
                    return (nil, row[valueColumn])
                }
            } else {
                // No id, return complete table
                var tableDict = [String: String]()
                
                let query = try! db.prepare(table)
                for row in query {
                    tableDict[row[keyColumn]] = row[valueColumn]
                }
                
                return (nil, tableDict)
            }
        }
        return (nil, nil)
    }
    
    func write(args: [Any]) -> String? {
        let key = args[0] as! String
        let value = args[1] as? String
        
        let tableName: String
        if let index = key.firstIndex(of: "/") {
            tableName = String(key[key.startIndex..<index])
        } else {
            tableName = key
        }
        
        let table = Table(tableName)
        
        if value == nil {
            // delete
            if tableName == key {
                // Drop table
                try! db.run(table.drop(ifExists: true))
            } else {
                let id = String(key[key.index(after: key.firstIndex(of: "/")!)...])
                
                _ = try? db.run(table.where(keyColumn == id).delete())
            }
        } else {
            if tableName == key {
                fatalError("Bulk write not yet implemented!")
            } else {
                let id = String(key[key.index(after: key.firstIndex(of: "/")!)...])
                
                // Check if table exists
                let statement = try! db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
                try! statement.run(tableName)
                
                if statement.makeIterator().next() == nil {
                    // Table doesn't exist yet, create it and insert the row
                    try! db.run(table.create { t in
                        t.column(keyColumn, primaryKey: true)
                        t.column(valueColumn)
                    })
                    try! db.run(table.insert(keyColumn <- id, valueColumn <- value!))
                } else {
                    // Table exists
                    if try! db.scalar(table.where(keyColumn == id).count) > 0 {
                        // Update value if row exists
                        try! db.run(table.where(keyColumn == id).update(valueColumn <- value!))
                    } else {
                        // Add new row otherwise
                        try! db.run(table.insert(keyColumn <- id, valueColumn <- value!))
                    }
                }
            }
        }
        return nil
    }
}
