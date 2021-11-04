import * as docker from "@pulumi/docker";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import { kubeConfig, kubeProvider } from "./cluster";
import { baseName, cfApiToken, cfZoneId, dnsName } from "./config";


export { kubeConfig };

// Create and export static external IP, which will be used by Ingress & DNS services
const externalIP = new gcp.compute.GlobalAddress("externalip", {});
export const ingressPublicIP = externalIP.address;

// Create and export DNS record. TTL unit is in seconds
const dnsZone = cloudflare.Zone.get(baseName, cfZoneId).zone;
const dnsRecord = new cloudflare.Record(baseName, {
  name: dnsName,
  zoneId: cfZoneId,
  type: "A",
  value: ingressPublicIP,
  ttl: 300
});
export const serviceDNS = dnsRecord.hostname;

// Create Kubernetes Namespaces, one for App and one for Cert management
// Cert NS is named "cert-manager", as it's the default.
// It's provided by Yaml install file.
// See https://cert-manager.io/docs/installation/kubectl/
const appns = new k8s.core.v1.Namespace(baseName, {}, { provider: kubeProvider });
export const appNamespace = appns.metadata.apply(m => m.name);
export const certNamespace = "cert-manager";

// Deploy cert-manager CRD & pods
const certManager = new k8s.yaml.ConfigFile("cert-manager", {
        file: "https://github.com/jetstack/cert-manager/releases/download/v1.6.1/cert-manager.yaml"
    },
    { provider: kubeProvider }
);


// Deploy CF API Token into a K8s Secret, needed for auto dns challenge
const cfApiTokenSecret = new k8s.core.v1.Secret("cloudflare-api-token", {
        metadata: {
            name: "cloudflare-api-token",
            namespace: certNamespace
        },
        stringData: {
            "api-token": cfApiToken
        },
    },
    { provider: kubeProvider }
);


// Create and export name of a ClusterIssuer, using cf api token
export const acmeProvider = "letsencrypt";
const certIssuer = new k8s.apiextensions.CustomResource(acmeProvider, {
        apiVersion: "cert-manager.io/v1",
        kind: "ClusterIssuer",
        metadata: {
            name: acmeProvider
        },
        spec: {
            acme: {
                email: "michel@loiseleur.com",
                privateKeySecretRef: {
                  name: `${baseName}-key`
                },
                server: "https://acme-v02.api.letsencrypt.org/directory",
                solvers: [ {
                    dns01: {
                        cloudflare: {
                            email: "michel@loiseleur.com",
                            apiTokenSecretRef: {
                                name: "cloudflare-api-token",
                                key: "api-token"
                            }
                        }
                    }
                } ]
            }
        }
    },
    { provider: kubeProvider }
);


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

// Create app Deployment
const appLabels = { appClass: baseName };
const deployment = new k8s.apps.v1.Deployment(baseName,
    {
        metadata: {
            namespace: appNamespace,
            labels: appLabels,
        },
        spec: {
            replicas: 2,
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

// Create a LoadBalancer Service for this app
const service = new k8s.core.v1.Service(baseName,
    {
        metadata: {
            labels: appLabels,
            namespace: appNamespace,
            annotations: {
                "networking.gke.io/load-balancer-type": "Internal",
                "cloud.google.com/neg": '{"ingress": true}',
                "cloud.google.com/app-protocols": '{"https-port":"HTTPS"}',
            }
        },
        spec: {
            type: "LoadBalancer",
            ports: [{ name: "https-port", port: 443, targetPort: "https" }],
            selector: appLabels,
        },
    },
    {
        provider: kubeProvider,
    }
);

// Export the Service name
export const serviceName = service.metadata.apply(m => m.name);

const ingress = new k8s.networking.v1.Ingress(baseName, {
        metadata: {
            labels: appLabels,
            namespace: appNamespace,
            annotations: {
                "kubernetes.io/ingress.class": "gce",
                "kubernetes.io/ingress.global-static-ip-name": externalIP.name,
                "cert-manager.io/cluster-issuer": acmeProvider,
            }
        },
        spec: {
            tls: [
                { secretName: baseName,
                  hosts: [ serviceDNS ] }
            ],
            rules: [
                { host: serviceDNS,
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
    },
    {
        provider: kubeProvider,
    }
);


