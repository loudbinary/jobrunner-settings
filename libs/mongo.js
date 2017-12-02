let instance;
const _ = require('lodash');
const client = require('mongodb').MongoClient;
const debug = process.env.DEBUG;
const hash = require('object-hash');
const Utils = require('./utils');
let utils = new Utils();

function Mongodb(){
    if (_.isNil(instance)){
        instance = this;
        if (_.isNil(process.env.JRS_MONGODB_URL)){
            throw new Error('Missing JRS_MONGODB_URL, see README.md');
        } else {
            instance.url = process.env.JRS_MONGODB_URL;
        }
        this.testConnection = function(callback){
            client.connect(instance.url,(err,db)=>{
                if (err) throw new Error(err);
                if (debug) console.log('Connection successful to Mongodb');
                instance.db = db;
                callback(null);
            });
        };
        instance.read = function (callback){
            let collection = instance.db.collection(process.env.JRS_COLLECTION);
            collection.find({}).toArray((err,docs)=>{
                if (err) throw new Error(err);
                callback(err,docs);
            });
        };

        instance.writeNewVersion = function(target,platform,doc){
            return new Promise((resolve,reject)=>{
                let collection = instance.db.collection(process.env.JRS_COLLECTION);
                collection.findOne({"current.target" : target, "current.platform": platform},(err,results)=>{
                    if (err) reject(err);
                    let currentVersion = results.current.v;
                    let now = new Date();
                    let updatedTime = `${now.toLocaleString()} TZ: ${now.getTimezoneOffset()/60}h`;
                    let oldVer = {
                        v: results.current.v,
                        updated_by: utils.whoami,
                        updated_at: updatedTime,
                        settings_hash: hash(results.current.settings),
                        settings: results.current.settings
                    }
                    results.prev.push(oldVer);
                    results.current = {
                        "v": results.current.v+1,
                        target: results.current.target,
                        platform: results.current.platform,
                        updated_by: utils.whoami,
                        updated_at: updatedTime,
                        settings_hash: hash(doc),
                        settings: doc
                    }
                    collection.updateOne({"current.v": currentVersion, "current.target": results.current.target, "current.platform": results.current.platform}, {"$set": results},(err,results)=>{
                        if (err) reject(err);
                        if (results.result.nModified !=1){
                            console.log('Unable to update target',target,' for platform',platform);
                        } else {
                            console.log('Updated target',target, 'for platform',platform);
                            resolve(null);
                        }
                    });

                });
            })

        }

        instance.writeDb = function(settings){
            return new Promise((resolve,reject)=>{
                let collection = instance.db.collection(process.env.JRS_COLLECTION);
                collection.insertMany(settings,(err)=>{
                    if (err) reject(err);
                    console.log(settings.length,'documents inserted');
                    resolve(null);
                })
            })
        }

        instance.cleanDb = function(){
            return new Promise((resolve)=>{
                let collection = instance.db.collection(process.env.JRS_COLLECTION);
                collection.find({}).toArray((err,docs)=>{
                    if (err) throw new Error(err);
                    if (docs.length >0){
                        collection.drop();
                        resolve(null);
                    } else {
                        resolve(null)
                    }   
                });
                
                
            })

        }
    }
    return instance;
}

module.exports = Mongodb;