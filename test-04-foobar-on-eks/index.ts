import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { appName } from "./config";
import * as eks from "./eks";
import * as cm from "./cert-manager";
import * as app from "./app";

export { appName };

// Create repo, build image and export appImage
const repo = new awsx.ecr.Repository(appName);
export const appImage = repo.buildAndPushImage(`./${appName}`);

// Create K8s cluster & export KubeConfig
const eksCluster = new eks.EksCluster(appName, {});
export const eksKubeConfig = pulumi.secret(eksCluster.cluster.kubeconfig);
export const clusterName = eksCluster.clusterName;


// Create a list of named clusters where app will be deployed
interface Cluster {
    name: string;
    provider: k8s.Provider;
}
const clusters: Cluster[] = [
    { name: "eks", provider: eksCluster.provider }
];

// Deploy cert-manager and app on cluster list
for (const cluster of clusters) {
    const cert = new cm.CertManager(cluster.name, { provider: cluster.provider });
    const pods = new app.App(cluster.name, { 
        provider: cluster.provider, 
        acmeProvider: cert.acmeProvider, 
        imageUrl: appImage 
    });
}


