#!/usr/bin/env node
/**
 * Upload Firebase Service Account JSON to AWS Secrets Manager
 *
 * Usage:
 *   node scripts/upload-firebase-secret.js <env>
 *
 * Example:
 *   npm run upload-firebase-secret:dev
 */

const { SecretsManagerClient, PutSecretValueCommand, DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('❌ Error: Missing required environment argument');
  console.error('');
  console.error('Usage: npm run upload-firebase-secret:<env>');
  console.error('');
  console.error('Examples:');
  console.error('  npm run upload-firebase-secret:dev');
  console.error('  npm run upload-firebase-secret:stage');
  console.error('  npm run upload-firebase-secret:prod');
  process.exit(1);
}

const env = args[0];

// Validate environment
const validEnvs = ['dev', 'stage', 'prod'];
if (!validEnvs.includes(env)) {
  console.error(`❌ Error: Invalid environment "${env}"`);
  console.error(`Valid environments: ${validEnvs.join(', ')}`);
  process.exit(1);
}

// Firebase JSON file path (relative to project root)
const firebaseJsonPath = path.resolve(__dirname, '../backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json');

// Check if file exists
if (!fs.existsSync(firebaseJsonPath)) {
  console.error(`❌ Error: Firebase JSON file not found at: ${firebaseJsonPath}`);
  console.error('');
  console.error('Expected location: backend/one-click-tag-5fade-firebase-adminsdk-fbsvc-d0795f630e.json');
  process.exit(1);
}

// Read and parse Firebase JSON
let firebaseJson;
try {
  const fileContent = fs.readFileSync(firebaseJsonPath, 'utf8');
  firebaseJson = JSON.parse(fileContent);
} catch (error) {
  console.error(`❌ Error: Failed to read or parse Firebase JSON file: ${error.message}`);
  process.exit(1);
}

// Validate Firebase JSON structure
const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !firebaseJson[field]);
if (missingFields.length > 0) {
  console.error(`❌ Error: Invalid Firebase JSON. Missing required fields: ${missingFields.join(', ')}`);
  process.exit(1);
}

// Validate it's a service account
if (firebaseJson.type !== 'service_account') {
  console.error(`❌ Error: Invalid Firebase JSON type. Expected "service_account", got "${firebaseJson.type}"`);
  process.exit(1);
}

// Get AWS region
const region = process.env.AWS_REGION || 'eu-central-1';

// Initialize Secrets Manager client
const client = new SecretsManagerClient({ region });

// Secret names (must match Terraform)
const serviceAccountSecretName = `oneclicktag/${env}/firebase-service-account`;
const projectIdSecretName = `oneclicktag/${env}/firebase-project-id`;

async function uploadSecret(secretName, secretValue) {
  const valueString = typeof secretValue === 'string' ? secretValue : JSON.stringify(secretValue);

  try {
    // Check if secret exists
    await client.send(new DescribeSecretCommand({ SecretId: secretName }));

    // Secret exists, update it
    console.log(`📝 Updating existing secret: ${secretName}`);
    await client.send(new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: valueString,
    }));
    console.log(`✅ Secret updated successfully: ${secretName}`);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error(`❌ Error: Secret not found: ${secretName}`);
      console.error('');
      console.error('Make sure you have applied Terraform first in the oneclicktag-infra repo:');
      console.error(`  cd ../oneclicktag-infra`);
      console.error(`  terraform apply -var="env_name=${env}" -var="aws_region=${region}"`);
      console.error('');
      process.exit(1);
    } else if (error.name === 'AccessDeniedException') {
      console.error(`❌ Error: Access denied to secret: ${secretName}`);
      console.error('');
      console.error('Make sure your AWS credentials have the following permissions:');
      console.error('  - secretsmanager:GetSecretValue');
      console.error('  - secretsmanager:PutSecretValue');
      console.error('  - secretsmanager:DescribeSecret');
      console.error('');
      process.exit(1);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('  Firebase Secret Upload to AWS Secrets Manager');
  console.log('================================================');
  console.log('');
  console.log(`Environment:     ${env}`);
  console.log(`Region:          ${region}`);
  console.log(`Firebase JSON:   ${firebaseJsonPath}`);
  console.log(`Project ID:      ${firebaseJson.project_id}`);
  console.log(`Client Email:    ${firebaseJson.client_email}`);
  console.log('');
  console.log('Uploading secrets...');
  console.log('');

  try {
    // Upload service account JSON
    await uploadSecret(serviceAccountSecretName, firebaseJson);

    // Upload project ID
    await uploadSecret(projectIdSecretName, firebaseJson.project_id);

    console.log('');
    console.log('================================================');
    console.log('✅ All secrets uploaded successfully!');
    console.log('================================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your ECS service to pick up the new secrets:');
    console.log('');
    console.log(`   aws ecs update-service \\`);
    console.log(`     --cluster ${env}-api-cluster \\`);
    console.log(`     --service ${env}-api-svc \\`);
    console.log(`     --force-new-deployment \\`);
    console.log(`     --region ${region}`);
    console.log('');
    console.log('2. Check container logs for successful Firebase initialization:');
    console.log('');
    console.log(`   aws logs tail /ecs/${env}-api --follow --region ${region}`);
    console.log('');
    console.log('   Look for: "Firebase initialized successfully"');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Error uploading secrets:', error.message);
    console.error('');
    if (error.name === 'UnrecognizedClientException') {
      console.error('AWS credentials not configured. Make sure you have:');
      console.error('1. AWS CLI installed: brew install awscli');
      console.error('2. AWS credentials configured: aws configure');
      console.error('3. Proper permissions to access Secrets Manager');
    }
    console.error('');
    process.exit(1);
  }
}

main();
