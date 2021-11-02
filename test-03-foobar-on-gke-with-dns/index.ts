import * as docker from "@pulumi/docker";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import { kubeConfig, kubeProvider } from "./cluster";
import { baseName, cfZoneId, dnsName } from "./config";


export { kubeConfig };

export const dnsZone = cloudflare.Zone.get(baseName, cfZoneId).zone;

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(baseName, {}, { provider: kubeProvider });

// Export the Namespace name
export const namespaceName = ns.metadata.apply(m => m.name);

// Get the GCP project registry repository & URL
const registry = gcp.container.getRegistryRepository();
const repositoryUrl = registry.then(_r => _r.repositoryUrl);

// Build foobar-api, aka whoami, app
const customImage = "whoami";
const appImage = new docker.Image(customImage, {
    imageName: pulumi.interpolate`${repositoryUrl}/${customImage}:v1.0.0`,
    build: {
        context: `./${customImage}`,
    },
});

// Export full Image reference
export const imageId = appImage.id;

// Create a NGINX Deployment
const appLabels = { appClass: baseName };
const deployment = new k8s.apps.v1.Deployment(baseName,
    {
        metadata: {
            namespace: namespaceName,
            labels: appLabels,
        },
        spec: {
            replicas: 1,
            selector: { matchLabels: appLabels },
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {
                    containers: [
                        {
                            name: baseName,
                            image: appImage.imageName,
                            ports: [{ name: "https", containerPort: 443 }]
                        }
                    ],
                }
            }
        },
    },
    {
        provider: kubeProvider,
    }
);

// Export the Deployment name
export const deploymentName = deployment.metadata.apply(m => m.name);

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(baseName,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
        },
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 443, targetPort: "https" }],
            selector: appLabels,
        },
    },
    {
        provider: kubeProvider,
    }
);

// Export the Service name and public LoadBalancer endpoint
export const serviceName = service.metadata.apply(m => m.name);
export const servicePublicIP = service.status.apply(s => s.loadBalancer.ingress[0].ip)

// Create and export DNS record. TTL unit is in seconds
const dnsRecord = new cloudflare.Record(baseName, {
  name: dnsName,
  zoneId: cfZoneId,
  type: "A",
  value: servicePublicIP,
  ttl: 300
});
export const serviceDNS = dnsRecord.hostname;
