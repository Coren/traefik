import { Config } from "@pulumi/pulumi";

const config = new Config();

// appName is the name of local directory containing app
// Defaults to whoami if not specified
export const appName = config.get("appName") || "whoami";


// certManagerYamlUrl is Install Url provided by cert-manager
// See https://cert-manager.io/docs/installation/
// Defaults to https://github.com/jetstack/cert-manager/releases/download/v1.6.1/cert-manager.yaml
export const certManagerYamlUrl = config.get("certManagerYamlUrl") || 
  "https://github.com/jetstack/cert-manager/releases/download/v1.6.1/cert-manager.yaml";


// awsIngressUrl is Install Url provided by AWS Load Balancer Ingress Controller
// See https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.3/deploy/installation/#apply-yaml
// Defaults to https://github.com/kubernetes-sigs/aws-load-balancer-controller/releases/download/v2.3.0/v2_3_0_full.yaml
export const awsIngressUrl = config.get("awsIngressUrl") || 
  "https://github.com/kubernetes-sigs/aws-load-balancer-controller/releases/download/v2.3.0/v2_3_0_full.yaml"


// emailAccount is Email used for Let's Encrypt & CF
// No defaults
export const emailAccount = config.require("emailAccount");

// cfApiToken is the Api Token obtained on cloudflare interface
// No defaults, you need one.
// You can configure it with "pulumi config set cloudflare:apiToken --secret"
const cfConfig = new Config("cloudflare");
export const cfApiToken = cfConfig.require("apiToken");

// cfZoneId is the id obtained after having purchased a zone on Cloudflare
// You get it on this call : https://api.cloudflare.com/client/v4/zones
// No defaults, you need to select one.
export const cfZoneId = config.require("cfZoneId");

// dnsName is the dns A record to use for public url, without zone suffix
// Defaults to whoami
export const dnsName = config.get("dnsName") || "whoami";
