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

<code>
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get install -y apt-transport-https ca-certificates gnupg
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-sdk
sudo apt-get install kubectl
</code>

After that, I need to create and configure a GCP project

<code>
gcloud init
gcloud projects create --name traefik --set-as-default # This one didn't work, so I created project from the Google Web UI
glcoud projects list
gcloud config set project <GCP_PROJECT_ID>
gcloud auth application-default login
</code>

And that's it !


## Step 2 : Let's test a basic tutorial


Let's see the javascript way.
https://www.pulumi.com/docs/get-started/gcp/create-project/

<code>
mkdir test-01-basic-pulumi-tutorial
cd test-01-basic-pulumi-tutorial
pulumi new gcp-javascript # Note : You can use your github account with pulumi, nice !
</code>

After reviewing the code, launch it like this :
<code>
gcloud auth init
pulumi up
</code>

If ressources are unsync, you can refresh when creating env :
<code>
pulumi up --refresh
</code>

## Step 3 : Let's test a basic GKE deployment

Pulumi provides an how-to here:
https://www.pulumi.com/registry/packages/kubernetes/how-to-guides/gke/

And an api reference with GCP here:
https://www.pulumi.com/registry/packages/gcp/api-docs/

<code>
mkdir test-02-basic-gke-hello-world && cd test-02-basic-gke-hello-world
pulumi new typescript
</code>

## Step 4 : Let's begin a more elaborate, traefik-based, deployment

<code>
mkdir test-03-foobar-on-gke-with-dns && cd test-03-foobar-on-gke-with-dns
pulumi new kubernetes-typescript
</code>

# We can split source code of test-02, as shown on Canary Deployment Pulumi example
## https://github.com/pulumi/examples/tree/master/gcp-ts-gke

# Made a simple Dockerfile, with self-signed cert  for the momnet
# Need to configure docker auth, gcloud auth is not enough for GCR
## https://cloud.google.com/container-registry/docs/advanced-authentication#gcloud-helper
## gcloud auth configure-docker
