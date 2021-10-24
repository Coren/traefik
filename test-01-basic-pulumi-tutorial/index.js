"use strict";
const pulumi = require("@pulumi/pulumi");
const gcp = require("@pulumi/gcp");

// Create a GCP resource (Storage Bucket)
const bucket = new gcp.storage.Bucket("my-bucket");

// Export the DNS name of the bucket
exports.bucketName = bucket.url;

const bucketObject = new gcp.storage.BucketObject("index.html", {
    bucket: bucket.name,
    source: new pulumi.asset.FileAsset("index.html")
});

