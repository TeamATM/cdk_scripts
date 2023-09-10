const AWS = require('aws-sdk');
const ssm = new AWS.SSM();

exports.handler = async (event) => {
  const instanceTagName = "stage";
  const instanceTagValue = "develop";

  // ec2에서 실행될 명령어
  const command = 
`#!/bin/bash
./docker-login.sh
sudo docker-compose pull
sudo docker-compose up -d
echo y | sudo docker system prune
echo $(date) >> lambdaExecution`;

  // Get instances by tag
  const getInstancesByTagParams = {
    Filters: [
      {
        Name: `tag:${instanceTagName}`,
        Values: [instanceTagValue],
      },
    ],
  };

  let instanceIds;
  // Instance의 Tag를 통해 명령어를 실행할 타겟 인스턴스 지정
  try {
    const instances = await new AWS.EC2().describeInstances(getInstancesByTagParams).promise();
    instanceIds = instances.Reservations.reduce((acc, reservation) => {
      return acc.concat(
        reservation.Instances.map((instance) => {
          return instance.InstanceId;
        })
      );
    }, []);
  } catch (error) {
    console.error('Error fetching instances by tag:', error);
    throw error;
  }

  try {
    const result = await ssm.sendCommand({
        DocumentName: 'AWS-RunShellScript',
        InstanceIds: instanceIds,
        Parameters: {
            commands: [command],
            workingDirectory: ['/home/ubuntu']
        },
        TimeoutSeconds: 30,
    }).promise();
    console.log('SSM SendCommand successful:', result);
  } catch (error) {
    console.error('SSM SendCommand error:', error);
    throw error;
  }
};
