import * as docker from "@pulumi/docker";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { kubeConfig, kubeProvider } from "./cluster";
import { baseName } from "./config";


export { kubeConfig };

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
                            image: "nginx:latest",
                            ports: [{ name: "http", containerPort: 80 }]
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
            ports: [{ port: 80, targetPort: "http" }],
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

