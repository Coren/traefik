import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import * as aws from "@pulumi/aws";
import { appName, cfZoneId, cfApiToken, awsIngressUrl } from "./config";

// Arguments for foobar deployment.
export interface AppArgs {
    provider: k8s.Provider; // Provider resource for the target Kubernetes cluster.
    acmeProvider: string; // ClusterIssuer cert provider name
    imageUrl: pulumi.Output<string>; // docker image to deploy.
}


// Warning : Name is used to change annotations, depending on EKS or GKS specifics
export class App extends pulumi.ComponentResource {
    public appUrl: pulumi.Output<string>;

    constructor(name: string,
                args: AppArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("foobar:app", name, args, opts);


        // Construct Url, which is basically appName.ZoneName
        const dnsZone = cloudflare.Zone.get(appName, cfZoneId).zone;
        const appHostname = pulumi.interpolate`${appName}.${dnsZone}`;

        // Create the Deployment.
        const appLabels = {app: appName};
        const deployment = new k8s.apps.v1.Deployment(appName, {
            spec: {
                selector: {matchLabels: appLabels},
                replicas: 2,
                template: {
                    metadata: {labels: appLabels},
                    spec: {
                        containers: [
                            {
                                name: appName,
                                image: args.imageUrl,
                                ports: [{containerPort: 443, name: "https"}],
                                livenessProbe: {
                                    httpGet: {path: "/bench", scheme: "HTTPS", port: 443},
                                    initialDelaySeconds: 5,
                                    timeoutSeconds: 1,
                                    periodSeconds: 10,
                                    failureThreshold: 3,
                                },
                                readinessProbe: {
                                    httpGet: {path: "/", scheme: "HTTPS", port: 443},
                                    initialDelaySeconds: 5,
                                    timeoutSeconds: 1,
                                    periodSeconds: 10,
                                    failureThreshold: 3,
                                },
                            },
                        ],
                    },
                },
            },
        }, {provider: args.provider, parent: this});

        // Create a LoadBalancer Service to expose app Deployment.
        const service = new k8s.core.v1.Service(appName, {
            spec: {
                type: "LoadBalancer",
                selector: appLabels,
                ports: [{port: 443, targetPort: 443}],
            },
        }, {provider: args.provider, parent: this});
        const serviceName = service.metadata.apply(m => m.name);

        let annotations = { };
        if (name === "eks") {
            annotations = {
                "cert-manager.io/cluster-issuer": args.acmeProvider,
                "kubernetes.io/ingress.class": "alb",
                "alb.ingress.kubernetes.io/scheme": "internet-facing",
                "alb.ingress.kubernetes.io/target-type": "ip",
            }
        }
        
        const ingress = new k8s.networking.v1.Ingress(appName, {
            metadata: {
                labels: appLabels,
                annotations: annotations
            },
            spec: {
                tls: [
                    { secretName: appName,
                      hosts: [ appHostname ] }
                ],
                rules: [
                    { host: appHostname,
                      http: { paths: [
                        { path: "/", pathType: "Prefix",
                          backend: {
                            service: { name: serviceName, port: { number: 443 } }
                          }
                        }
                      ] }
                    }
                ]
            }
        }, {provider: args.provider, parent: this});

        let ip = ingress.status.loadBalancer.ingress[0].ip;

        /*
        // Create and export DNS record. TTL unit is in seconds
        const dnsRecord = new cloudflare.Record(appName, {
            name: appName,
            zoneId: cfZoneId,
            type: "A",
            value: ip,
            ttl: 300
        });*/


        /*
        // The address appears in different places depending on the Kubernetes service provider.
        let address = service.status.loadBalancer.ingress[0].hostname;
        if (name === "gke" || name === "aks") {
            address = service.status.loadBalancer.ingress[0].ip;
        }
        */

        this.appUrl = pulumi.interpolate`https://${appHostname}`;
        

        this.registerOutputs();
    }
}
