"use strict";
const pulumi = require("@pulumi/pulumi");
const gcp = require("@pulumi/gcp");

// Create a GCP resource (Storage Bucket)
const bucket = new gcp.storage.Bucket("my-bucket", {
    website: {
        mainPageSuffix: "index.html"
    },
    uniformBucketLevelAccess: true,
    forceDestroy: true
});

// anonymous Access to files in this bucket
const bucketIAMBinding = new gcp.storage.BucketIAMBinding("my-bucket-IAMBinding", {
    bucket: bucket.name,
    role: "roles/storage.objectViewer",
    members: ["allUsers"]
});

// Sample file
const bucketObject = new gcp.storage.BucketObject("index.html", {
    bucket: bucket.name,
    contentType: "text/html",
    source: new pulumi.asset.FileAsset("index.html")
});

// Export DNS name of the bucket
exports.bucketName = bucket.url;
// Export URL of web server bucket
exports.bucketEndpoint = pulumi.concat("http://storage.googleapis.com/", bucket.name, "/", bucketObject.name);
