import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { cfApiToken, certManagerYamlUrl, emailAccount } from "./config";

// Arguments for cert-manager deployment
export interface CertManagerArgs {
    provider: k8s.Provider; // Provider resource for the target Kubernetes cluster.
}

export class CertManager extends pulumi.ComponentResource {
    public acmeProvider: string;

    constructor(name: string,
                args: CertManagerArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("foobar:cert-manager", name, args, opts);


/*        // Create cert-manager NS
        const certManagerNS = new k8s.core.v1.Namespace("cert-manager", 
            { metadata: { name: "cert-manager" }
        }, {provider: args.provider, parent: this});*/

        // Deploy CRD & Pods of cert-manager within this namespace
        const certManager = new k8s.yaml.ConfigFile("cert-manager", {
            file: certManagerYamlUrl
        }, {provider: args.provider, parent: this});

        // Deploy CF API Token into a K8s Secret, needed for auto dns challenge
        const cfApiTokenSecret = new k8s.core.v1.Secret("cloudflare-api-token", {
            metadata: {
                name: "cloudflare-api-token",
                namespace: "cert-manager",
            },
            stringData: {
                "api-token": cfApiToken
            },
        }, {provider: args.provider, parent: this, dependsOn: certManager.ready });

        // Create ClusterIssuer
        this.acmeProvider = "letsencrypt";
        const certIssuer = new k8s.apiextensions.CustomResource(this.acmeProvider, {
            apiVersion: "cert-manager.io/v1",
            kind: "ClusterIssuer",
            metadata: {
                name: this.acmeProvider
            },
            spec: {
                acme: {
                    email: emailAccount,
                    privateKeySecretRef: {
                      name: `${this.acmeProvider}-key`
                    },
                    server: "https://acme-v02.api.letsencrypt.org/directory",
                    solvers: [ {
                        dns01: {
                            cloudflare: {
                                email: emailAccount,
                                apiTokenSecretRef: {
                                    name: "cloudflare-api-token",
                                    key: "api-token"
                                }
                            }
                        }
                    } ]
                }
            }
        // dependsOn is flawed for Yaml. This is a known workaround.
        // See https://github.com/pulumi/pulumi-kubernetes/issues/861#issuecomment-901862700
        }, {provider: args.provider, parent: this, dependsOn: pulumi.output(certManager)});

        this.registerOutputs();
    }
}
