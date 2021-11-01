import * as gcp from "@pulumi/gcp";
import { Config } from "@pulumi/pulumi";

const config = new Config();

// clusterName is the name of the Hosted Cluster
// Defaults to "cluster" if not specified
export const clusterName = config.get("clusterName") || "cluster";

// baseName is the name for all objects inside the cluster
// Defaults to "traefik" if not specified
export const baseName = config.get("baseName") || "traefik"

// nodeCount is the number of cluster nodes to provision. 
// Defaults to 3 if unspecified.
export const nodeCount = config.getNumber("nodeCount") || 2;

// nodeMachineType is the machine type to use for cluster nodes. 
// Defaults to n1-standard-1 if unspecified.
// See https://cloud.google.com/compute/docs/machine-types for details.
export const nodeMachineType = config.get("nodeMachineType") || "n1-standard-1";
