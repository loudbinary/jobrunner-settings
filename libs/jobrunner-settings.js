let instance;
const _ = require('lodash');
const Mongo = require('./mongo');
const Utils = require('./utils');
const Args = require('./args');
let mongo = new Mongo();
let utils = new Utils();
function JobrunnerSettings(cliArgs = process.argv){
    if(_.isNil(instance)){
        this.args = new Args(cliArgs);
        this.mongo = mongo;
        this.utils = utils;
        this.initialize = (callback)=>{
            mongo.testConnection(()=>{
                callback(null);
            })
        };
        instance = this;
    }
    return instance;
}

module.exports = JobrunnerSettings;