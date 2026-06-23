#!/bin/bash
# ─── AWS ECS Deployment Script ─────────────────────────────
# Deploys the backend to AWS ECS Fargate.
# Usage: ./scripts/deploy-ecs.sh [staging|production]
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - ECR repository created
#   - ECS cluster and task definition created
#   - RDS PostgreSQL and ElastiCache Redis running

set -euo pipefail

ENV="${1:-staging}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
ECR_REPO="${ECR_REPO:-propertyos-backend}"
ECS_CLUSTER="propertyos-${ENV}"
ECS_SERVICE="propertyos-backend"
TASK_DEFINITION="propertyos-backend"

echo "🚀 Deploying to AWS ECS (${ENV})..."

# Step 1: Build Docker image
echo "📦 Building Docker image..."
docker build -t ${ECR_REPO}:${ENV} .

# Step 2: Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 3: Tag and push
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

docker tag ${ECR_REPO}:${ENV} ${ECR_URI}:${ENV}
docker tag ${ECR_REPO}:${ENV} ${ECR_URI}:latest
docker push ${ECR_URI}:${ENV}
docker push ${ECR_URI}:latest

# Step 4: Update task definition
echo "📝 Updating task definition..."
NEW_TASK_DEF=$(aws ecs register-task-definition \
  --family ${TASK_DEFINITION} \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 \
  --memory 1024 \
  --execution-role-arn arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole \
  --container-definitions "[{
    \"name\": \"backend\",
    \"image\": \"${ECR_URI}:${ENV}\",
    \"portMappings\": [{\"containerPort\": 3000, \"protocol\": \"tcp\"}],
    \"environment\": [
      {\"name\": \"NODE_ENV\", \"value\": \"${ENV}\"},
      {\"name\": \"APP_ENV\", \"value\": \"${ENV}\"}
    ],
    \"secrets\": [
      {\"name\": \"DATABASE_URL\", \"valueFrom\": \"arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/propertyos/${ENV}/DATABASE_URL\"},
      {\"name\": \"JWT_ACCESS_SECRET\", \"valueFrom\": \"arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/propertyos/${ENV}/JWT_ACCESS_SECRET\"},
      {\"name\": \"JWT_REFRESH_SECRET\", \"valueFrom\": \"arn:aws:ssm:${AWS_REGION}:${ACCOUNT_ID}:parameter/propertyos/${ENV}/JWT_REFRESH_SECRET\"}
    ],
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"/ecs/propertyos-${ENV}\",
        \"awslogs-region\": \"${AWS_REGION}\",
        \"awslogs-stream-prefix\": \"ecs\"
      }
    },
    \"healthCheck\": {
      \"command\": [\"CMD-SHELL\", \"wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1\"],
      \"interval\": 30,
      \"timeout\": 10,
      \"retries\": 3
    }
  }]" --query 'taskDefinition.taskDefinitionArn' --output text)

echo "  New task definition: ${NEW_TASK_DEF}"

# Step 5: Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster ${ECS_CLUSTER} \
  --service ${ECS_SERVICE} \
  --task-definition ${NEW_TASK_DEF} \
  --force-new-deployment

# Step 6: Wait for stability
echo "⏳ Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE}

echo ""
echo "✅ Deployment complete!"
echo "   Environment: ${ENV}"
echo "   Task: ${NEW_TASK_DEF}"
echo "   Cluster: ${ECS_CLUSTER}"
