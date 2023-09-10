import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export class ExecuteCommandEc2WhenEcrUpdateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    const repository = ecr.Repository.fromRepositoryName(this, "Ecr", "PUT_YOUR_ECR_REPO_NAME")

    // IAM role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
      ],
    });

    // ec2에 명령어를 실행시키기 위한 policy
    const ssmSendCommandPolicy = new iam.PolicyStatement({
      actions: ['ssm:SendCommand'],
      resources: ["*"],
      effect: iam.Effect.ALLOW
    });

    // lambda role에 추가
    lambdaRole.addToPolicy(ssmSendCommandPolicy);

    // Lambda function
    // lambda/index.js 파일
    const updateDockerLambda = new lambda.Function(this, 'UpdateDockerLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      role: lambdaRole,
    });

    // EventBridge rule for Image update
    // ECR repo에 develop tag를 가진 이미지가 업데이트되면 이벤트 발생
    const rule = new events.Rule(this, 'ImageUpdateRule', {
      eventPattern: {
        source: ['aws.ecr'],
        detailType: ['ECR Image Action'],
        detail: {
          "action-type": ["PUSH"],
          "result": ["SUCCESS"],
          "repository-name": [repository.repositoryName],
          "image-tag": ["develop"]
        },
      },
    });

    // 이벤트 발생시 타겟 설정(Lambda 실행) -> lambda가 ssm을 통해 ec2에 명령어 실행
    rule.addTarget(new targets.LambdaFunction(updateDockerLambda));
  }
}
