let instance;
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const writeJsonFile = require('write-json-file');
const exec = require('execa');
let hash = require('object-hash');
const debug = process.env.DEBUG || false;
function Utils(){

    function clear(dir){
        fs.ensureDir(dir);
        fs.emptyDirSync(dir);
        if (debug) console.log('Local DB Cleared')
    }

    function readLocalSetting(filePath){
        return fs.readJsonSync(filePath);
    }

    function createSettingsFolder(dbDir,doc){
        fs.ensureDir(path.join(dbDir,doc.current.target,doc.current.platform));
    }

    function writeSetting(dbDir,doc){
        let filePath = path.join(dbDir,doc.current.target,doc.current.platform,'settings.json');
        fs.ensureFileSync(filePath);
        writeJsonFile.sync(filePath, doc.current.settings)
    }

    function getTargets(p){
        let dirs = fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory())
        return dirs;
    }

    function getPlatformsSettings(p){
        let dirs = fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory())
        return dirs;
    }

    function getAllLocalSettings(dbDir){
        let targets = getTargets(dbDir);
        let settings = [];
        _.map(targets,target =>{
            let platforms = getPlatformsSettings(path.join(dbDir,target));
            _.each(platforms,platform =>{
                let readSettings = JSON.parse(fs.readFileSync(path.join(dbDir,target,platform,'settings.json'),'utf8'));
                let now = new Date();
                let updatedTime = `${now.toLocaleString()} TZ: ${now.getTimezoneOffset()/60}h`;
                settings.push({
                    current: {
                        v: 1,
                        target: target,
                        platform: platform,
                        updated_by: whoami(),
                        updated_at: updatedTime,
                        settings_hash: hash(readSettings),
                        settings: readSettings
                    },
                    prev: []

                })
            })
        })
        return settings;
    }
    function whoami(){
        return exec.shellSync('whoami').stdout;
    }
    if (_.isNil(instance)){
        this.localdb = {
             read(){
                 console.log('reading local db')
             },
             write(dbDir,docs){
                 console.log('Writing local db for', docs.length, 'documents');
                 clear(dbDir);
                 console.log('Writing documents');
                 _.each(docs,doc =>{
                     createSettingsFolder(dbDir,doc);
                     writeSetting(dbDir,doc);
                 })
             },
             readSetting(filePath){
                 return readLocalSetting(filePath)
             },
             getAllSettings(dbDir){
                 return getAllLocalSettings(dbDir);
             }
        };
        this.whoami = whoami();


        instance = this;
    }
    return instance;
}

module.exports = Utils;