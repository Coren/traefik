# Traefik

Let's try to deploy on  multi-cloud a simple app. 

## Step 1 : install pre-requisites

Let's try pulumi for this goal, a modern Infra-as-Code tool.

`curl -fsSL https://get.pulumi.com | sh`

We can use Javascript, Python, Go or .Net with Pulumi. Since I want to learn Go and I already know Javascript, let's install both Node and Go.

Node
<code>
curl -fsSL https://deb.nodesource.com/setup_17.x | sudo -E bash -
sudo apt-get install -y nodejs
</code>

Go
<code>
sudo apt-get install -t buster-backports golang-go
</code>

For vim plugin with TypeScript, add this to .vimrc
<code>
Plugin 'leafgarland/typescript-vim'
</code>
Close, reopen vim and install this new plugin `:pluginInstall`


We also need to install and configure a first cloud provider. Let's try with Google, since I already have a Google Account.

```
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get install -y apt-transport-https ca-certificates gnupg
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-sdk
sudo apt-get install kubectl
```

After that, I need to create and configure a GCP project

```
gcloud init
gcloud projects create --name traefik --set-as-default # This one didn't work, so I created project from the Google Web UI
glcoud projects list
gcloud config set project <GCP_PROJECT_ID>
gcloud auth application-default login
```

And that's it !


## Step 2 : Let's test a basic tutorial


Let's see the javascript way.
https://www.pulumi.com/docs/get-started/gcp/create-project/

```
mkdir test-01-basic-pulumi-tutorial
cd test-01-basic-pulumi-tutorial
pulumi new gcp-javascript # Note : You can use your github account with pulumi, nice !
```

After reviewing the code, launch it like this :
```
gcloud auth init
pulumi up
```

If ressources are unsync, you can refresh when creating env : `pulumi up --refresh`

## Step 3 : Let's test a basic GKE deployment

Pulumi provides an how-to here:
https://www.pulumi.com/registry/packages/kubernetes/how-to-guides/gke/

And an api reference with GCP here:
https://www.pulumi.com/registry/packages/gcp/api-docs/

```
mkdir test-02-basic-gke-hello-world && cd test-02-basic-gke-hello-world
pulumi new typescript
```

## Step 4 : Let's begin a more elaborate, ingress-based & cert-managed, deployment on GKE
```
mkdir test-03-foobar-on-gke-with-dns && cd test-03-foobar-on-gke-with-dns
pulumi new kubernetes-typescript
```

1. Split source code of test-02, as shown on Canary Deployment Pulumi example
   - https://github.com/pulumi/examples/tree/master/gcp-ts-gke
2. Made a simple Dockerfile, with self-signed cert  for the momnet
3. Need to configure docker auth, gcloud auth is not enough for GCR
   - https://cloud.google.com/container-registry/docs/advanced-authentication#gcloud-helper
   - gcloud auth configure-docker
4. Created an account on CloudFlare, pick up a Zone and create an API Account.
   - pulumi config set cloudflare:apiToken --secret
5. Get zoneId with Curl, and put it into config :
   - pulumi config set cfZoneId --secret
6. Read (a lot) of GKE, CloudFlare & cert-manager doc
   - cert-manager will use CloudFlare dns account


## Step 5 : Let's go to the same elaborate deployement, with k8x, on EKS


```
mkdir test-04-foobar-on-eks && cd test-04-foobar-on-eks
pulumi new aws-typescript
```
1. Create an AWS account. 
2. Create Access Key, following official documentation : https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys 
3. Install AWS cli, no debian package available for cli v2 : https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
4. Configure AWS cli, which creates ~/.aws./credentials, used by pulumi
   - aws configure
5. Tested basic AWS & Pulumi calls
6. Implement EKS in a multi-cluster way, with constructor approach
7. Configure Email Account & CloudFlare 
   - pulumi config set emailAccount
   - pulumi config set cloudflare:apiToken --secret
   - pulumi config set cfZoneId --secret
8. Save locally iam_policy
   - wget https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.3.0/docs/install/iam_policy.json
9. Set tags on subnet manually, ftm
   - aws ec2 describe-subnets
   - aws ec2 create-tags  --resources <privateSubnetId> --tags Key="kubernetes.io/role/internal-elb",Value=1
   - aws ec2 create-tags  --resources <publicSubnetId> --tags Key="kubernetes.io/role/elb",Value=1


