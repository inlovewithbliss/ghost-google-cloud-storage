'use strict';

var storage     = require('@google-cloud/storage')(),
    BaseStore   = require('ghost-storage-base'),
    Promise     = require('bluebird'),
    options     = {};

class GStore extends BaseStore {
    constructor(config = {}){
        super(config);
        options = config;

        this.bucket = storage.bucket(options.bucket);
        this.assetDomain = options.assetDomain || `storage.googleapis.com/${options.bucket}`;
        // default max-age is 3600 for GCS, override to something more useful
        this.maxAge = options.maxAge || 2678400;
    }

    save(image) {
        if (!options) return Promise.reject('google cloud storage is not configured');

        var targetDir = this.getTargetDir()

        return new Promise((resolve, reject) => {
            var opts = {
                destination: targetDir + '/' + this.getUniqueFileName(image, targetDir),
                metadata: {
                    cacheControl: `public, max-age=${this.maxAge}`
                },
                public: true
            };
            this.bucket.upload(image.path, opts, (err, file) => {
                if(err) {
                    return reject(err);
                }
                file.getMetadata((err, metadata) => {
                    if(err) {
                        return reject(err)
                    }
                    let filename = '//storage.googleapis.com/' + options.bucket + '/' + metadata.name
                    console.log('File uploaded: ' + filename + "\n")
                    return resolve(filename)
                })
            })
        })
    }

    // middleware for serving the files
    serve() {
        // a no-op, these are absolute URLs
        return function (req, res, next) { next(); };
    }

    exists (filename) {
        return new Promise((resolve, reject) => {
            this.bucket.file(filename).exists((err, data) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data[0]);
            })
        })
    }

    read (filename) {
      return new Promise(function (resolve, reject) {
        this.bucket.file(filename).download((err, content) => {
            if(err) {
                return reject(err)
            }
            return resolve(content)
        })
      })
    }

    delete (filename) {
        return this.bucket.file(filename).delete();
    }
}

module.exports = GStore;
