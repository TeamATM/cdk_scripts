import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import { Construct } from 'constructs';

export class RequestSpotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 기본 VPC 사용
    const vpc = ec2.Vpc.fromLookup(this, "Vpc", {isDefault: true});
    // instance에 설정할 보안그룹
    const sg = ec2.SecurityGroup.fromLookupByName(this, "Sg", "default", vpc);

    // spot관리를 위한 role
    const fleetRole = iam.Role.fromRoleName(this, "FleetRole", "aws-ec2-spot-fleet-tagging-role");
    // instance에 적용할 IAM
    // const role = iam.InstanceProfile.fromInstanceProfileName(this, "Iam", "put_your_iam_name")

    // 인스턴스가 실행되었을 때 실행할 스크립트(Optional)
    // const userData = fs.readFileSync('scripts/user-data.sh', 'utf-8');

    new ec2.CfnSpotFleet(this, "Spot", {
      spotFleetRequestConfigData: {
        iamFleetRole: fleetRole.roleArn,
        // spot 최대 가격 설정
        spotPrice: "0.45",
        // 목표 용량 설정
        targetCapacity: 1,
        launchSpecifications: [
          {
            // 접속시 사용할 키
            // keyName: "develop_key",
            // 사용할 이미지 (현재 Ubuntu-20.04)
            imageId: new ec2.GenericLinuxImage({"ap-northeast-2": "ami-04341a215040f91bb"}).getImage(this).imageId,
            // 인스턴스 타입 (현재 G5.XLARGE)
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.G5, ec2.InstanceSize.XLARGE).toString(),
            // 보안그룹(미설정시 default)
            securityGroups: [{groupId: sg.securityGroupId}],
            // IAM
            // iamInstanceProfile: {arn: role.instanceProfileArn},
            // subnet 설정
            // subnetId: vpc.selectSubnets({availabilityZones: ["ap-northeast-2a"]}).subnetIds[0],
            // storage 설정
            // blockDeviceMappings: [
            //   {
            //     deviceName: "/dev/sda1",
            //     ebs: {
            //       volumeSize: 50,
            //       // false시 instance 종료시에도 storage는 유지
            //       deleteOnTermination: true,
            //       volumeType: "gp2"
            //     }
            //   }
            // ],
            // userdata encode with base64
            // userData: btoa(userData),
          }
        ]
      }
    })
  }
}
