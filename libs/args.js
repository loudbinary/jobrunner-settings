/*
    Define argument processing
 */
let instance;
const _ = require('lodash');
const args = require('args');
const homeDirectory = require('home-dir')();
const path = require('path');
let jobrunnerDirectory = path.join(homeDirectory,'.jobrunner','environments');
let Mongo = require('./mongo');
let mongo = new Mongo();
let Utils = require('./utils');
let utils = new Utils();
let hash = require('object-hash');
const debug = process.env.DEBUG || false;

function Args(cliArgs){
    function refresh(options){
        if (debug) console.log('Queuing refresh');
    }

    function push(){
        if (debug) console.log('Queuing push...');
        mongo.read((err,docs)=>{
            returnInvalidSettingsInfo(docs).then(invalid =>{
                if (invalid.length > 0){
                    console.log('Build setting changes detected, updating each');
                    let outOfDate = [];
                    _.each(invalid,item =>{
                        let localPath = item.localPath;
                        let newLocalSettings = utils.localdb.readSetting(localPath);
                        outOfDate.push(mongo.writeNewVersion(item.target,item.platform,newLocalSettings))
                    });
                    Promise.all(outOfDate).then(()=>{
                       console.log('Push completed');
                    });
                } else {
                    console.log('No build settings need to be pushed, no changed detected!');
                }

            })

        })
    }

    function seed(){
        if (debug) console.log('Queuing push...');
        let settings = utils.localdb.getAllSettings(jobrunnerDirectory);
        mongo.cleanDb().then(()=>{
            mongo.writeDb(settings).then(()=>{
                console.log('Seeding completed', settings.length, 'inserted into Mongodb');
            })
        })
    }

    function clone(){
        if (debug) console.log('Queuing clone...');
        mongo.read((err,docs)=>{
            utils.localdb.write(jobrunnerDirectory,docs)
            console.log('Clone completed');
        });

    }

    function clean(){
        mongo.cleanDb().then(()=>{
            console.log('Mongodb database has been cleaned, all records deleted!');;
        })

    }
    function list(){
        if (debug) console.log('Queuing list...');
        mongo.read((err,docs)=>{
            _.each(docs,doc =>{
                console.log('jobrunner -t',doc.current.target,'-p',doc.current.platform);
            })
        })
    }

    function returnInvalidSettingsPaths(docs){
        let invalid = [];
        return new Promise((resolve)=>{
            _.each(docs,doc =>{
                let localPath = path.join(jobrunnerDirectory,doc.current.target,doc.current.platform,'settings.json');
                let localVersion = utils.localdb.readSetting(localPath);
                let localHash = hash(localVersion);
                if (localHash != doc.current.settings_hash){
                    invalid.push(localPath);
                }
            });
            resolve(invalid);
        })
    }

    function returnInvalidSettingsInfo(docs){
        let invalid = [];
        return new Promise((resolve)=>{
            _.each(docs,doc =>{
                let localPath = path.join(jobrunnerDirectory,doc.current.target,doc.current.platform,'settings.json');
                let localVersion = utils.localdb.readSetting(localPath);
                let localHash = hash(localVersion);
                if (localHash != doc.current.settings_hash){
                    invalid.push({
                        target: doc.current.target,
                        platform: doc.current.platform,
                        localPath: localPath
                    });
                }
            });
            resolve(invalid);
        })
    }


    function validate(callback){
        if (debug) console.log('Beginning build settings validation...');
        let invalid = [];
        mongo.read((err,docs)=>{
            let count = 0;
            returnInvalidSettingsPaths(docs).then(invalid =>{
                if (invalid.length > 0){
                    console.log('Build setting changes detected, make sure to push changes!');
                    console.log('');
                }
                _.each(invalid,item =>{
                    console.log(item);
                });
                console.log('');
                console.log(`${invalid.length} build settings.json were invalid`);
            })

        })
    }
    function assignJobrunnerDirectory(newFolder){
        jobrunnerDirectory = newFolder;
    }

    function debugAssign(debugValue){
        process.env.DEBUG = debugValue;
    }

    function collectionAssign(collectionValue){
        process.env.JRS_COLLECTION = collectionValue;
    }

    if (_.isNil(instance)){
        this.parse = function(cliArgs){
            args
                .option('folder', 'Location to save build settings',jobrunnerDirectory, jobrunnerDirectory,assignJobrunnerDirectory)
                .option('debug', 'Prints out helpful information and other details',false,debugAssign)
                .option('collection', 'Specify Mongodb collection name for storing build settings','builds',collectionAssign)
                .command('refresh', 'Refreshes your local build settings folder with changes from database',refresh)
                .command('clone', 'Creates new copy of current build settings from database', clone)
                .command('push', 'Pushes any changed build settings to database',push)
                .command('validate', 'Checks build settings directory for any changes', validate)
                .command('clean', 'Deleted all build settings from Mongodb, DANGEROUS', clean)
                .command('list', 'Lists all builds',list)
                .command('seed', 'Reseeds mongodb with your local database, overwriting everything - DANGEROUS',seed)
                .example('jobrunner-settings --folder ' + process.cwd() + ' refresh','Retrieves current settings from Mongodb and saves to current folder');
            return args.parse(cliArgs,{name: path.parse(process.argv[1]).base});

        };
        instance = this;
        return instance;
    } else {
        return instance;
    }
}

module.exports = Args;