import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { awsIngressUrl } from "./config";
import * as iam_policy from "./iam_policy.json";

export class EksCluster extends pulumi.ComponentResource {
    public cluster: eks.Cluster;
    public provider: k8s.Provider;
    public clusterName: pulumi.Output<string>;

    constructor(name: string,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("foobar:EksCluster", name, {}, opts);

        // Create a VPC for our cluster, with tags needed for ALB
        // See https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.3/deploy/subnet_discovery/
        const vpc = new awsx.ec2.Vpc("vpc", {});
        /* does not work
        for (const publicSubnetId of vpc.publicSubnetIds) {
            const tag = new aws.ec2.Tag(`public-${publicSubnetId}`, {
                resourceId: publicSubnetId, key: "kubernetes.io/role/elb", value: "1"
            });
        }
        for (const privateSubnetId of vpc.privateSubnetIds) {
            const tag = new aws.ec2.Tag(`private-${privateSubnetId}`, {
                resourceId: privateSubnetId, key: "kubernetes.io/role/internal-elb", value: "1"
            });
        }*/

        // Create the EKS cluster itself.
        this.cluster = new eks.Cluster("cluster", {
            vpcId: vpc.id,
            subnetIds: vpc.publicSubnetIds,
            instanceType: "t2.medium",
            desiredCapacity: 2,
            minSize: 1,
            maxSize: 2,
            deployDashboard: false,
            vpcCniOptions: {
                warmIpTarget: 4
            }
        });
        
        this.provider = this.cluster.provider;

        const nodesRoleName = this.cluster.instanceRoles.apply(roles => roles[0].name);
        this.clusterName = pulumi.interpolate`${this.cluster.eksCluster.name}`;

        // Deploy specific AWS IAM Policy for Ingress Controller
        // See https://www.pulumi.com/blog/kubernetes-ingress-with-aws-alb-ingress-controller-and-pulumi-crosswalk/
        // See https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.3/deploy/installation/#setup-iam-manually
        const ingressControllerPolicy = new aws.iam.Policy("ingress-iam-policy", {
            policy: JSON.stringify(iam_policy)
        }, { parent: this });

        // Attach this policy to the NodeInstanceRole of the worker nodes.
        const nodeinstanceRole = new aws.iam.RolePolicyAttachment("eks-node-policy-attach",  {
            policyArn: ingressControllerPolicy.arn,
            role: nodesRoleName
        }, { parent: this });

        // Deploy specific AWS LB Ingress Controller
        // Transform YAML, following documentation
        // https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.3/deploy/installation/#apply-yaml
        const awsIngress = new k8s.yaml.ConfigFile("awsIngress", {
            file: awsIngressUrl,
            transformations: [(obj: any) => {
                if(obj.kind === "Deployment") {
                    obj.spec.template.spec.containers[0].args[0] = `--cluster-name=${this.clusterName}`;
                }
            }]
        }, {provider: this.provider, parent: this});

        
        this.registerOutputs();

    }
}
