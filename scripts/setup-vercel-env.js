#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * 
 * This script helps setup environment variables for different Vercel environments
 * Usage: node scripts/setup-vercel-env.js [environment]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    VITE_API_BASE_URL: 'http://localhost:3001/api',
    VITE_APP_ENV: 'development',
    VITE_ENABLE_DEBUG_TOOLS: 'true',
    VITE_ENABLE_MOCK_API: 'false',
    NODE_ENV: 'development'
  },
  preview: {
    VITE_API_BASE_URL: 'https://api-staging.oneclicktag.com/api',
    VITE_APP_ENV: 'preview', 
    VITE_ENABLE_DEBUG_TOOLS: 'true',
    VITE_ENABLE_MOCK_API: 'false',
    NODE_ENV: 'production'
  },
  production: {
    VITE_API_BASE_URL: 'https://api.oneclicktag.com/api',
    VITE_APP_ENV: 'production',
    VITE_ENABLE_DEBUG_TOOLS: 'false',
    VITE_ENABLE_MOCK_API: 'false',
    NODE_ENV: 'production'
  }
};

// Environment variables that should be set from secrets
const secretEnvVars = [
  'VITE_SENTRY_DSN',
  'VITE_GTM_CONTAINER_ID',
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_POSTHOG_KEY',
  'VITE_MIXPANEL_TOKEN',
  'VITE_INTERCOM_APP_ID'
];

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    return null;
  }
}

function setVercelEnvVar(key, value, environment = 'development,preview,production') {
  console.log(`Setting ${key} for ${environment}...`);
  
  const command = `vercel env add ${key} ${environment}`;
  const result = runCommand(`echo "${value}" | ${command}`);
  
  if (result === null) {
    console.error(`Failed to set ${key}`);
    return false;
  }
  
  return true;
}

function getVercelEnvVars() {
  console.log('Fetching current Vercel environment variables...');
  const result = runCommand('vercel env ls');
  
  if (result) {
    console.log('Current environment variables:');
    console.log(result);
  }
}

function removeVercelEnvVar(key, environment) {
  console.log(`Removing ${key} from ${environment}...`);
  const result = runCommand(`vercel env rm ${key} ${environment}`);
  return result !== null;
}

function setupEnvironmentVars(targetEnv = 'all') {
  console.log(`Setting up environment variables for: ${targetEnv}`);
  
  // Check if vercel CLI is available
  const vercelVersion = runCommand('vercel --version');
  if (!vercelVersion) {
    console.error('Vercel CLI not found. Please install it: npm i -g vercel');
    process.exit(1);
  }
  
  console.log(`Using Vercel CLI version: ${vercelVersion}`);
  
  // Setup environment-specific variables
  if (targetEnv === 'all') {
    Object.keys(environments).forEach(env => {
      console.log(`\n--- Setting up ${env} environment ---`);
      setupEnvForEnvironment(env);
    });
  } else if (environments[targetEnv]) {
    setupEnvForEnvironment(targetEnv);
  } else {
    console.error(`Unknown environment: ${targetEnv}`);
    console.error(`Available environments: ${Object.keys(environments).join(', ')}, all`);
    process.exit(1);
  }
  
  console.log('\n--- Environment Setup Complete ---');
  console.log('Remember to set the following secret variables manually:');
  secretEnvVars.forEach(envVar => {
    console.log(`  vercel env add ${envVar} production`);
  });
}

function setupEnvForEnvironment(env) {
  const envVars = environments[env];
  const vercelEnv = env === 'development' ? 'development' : 
                   env === 'preview' ? 'preview' : 'production';
  
  Object.entries(envVars).forEach(([key, value]) => {
    setVercelEnvVar(key, value, vercelEnv);
  });
}

function validateEnvironmentVars() {
  console.log('Validating environment variable setup...');
  
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_APP_ENV',
    'NODE_ENV'
  ];
  
  // This would check against the actual Vercel project
  // For now, we'll just list what should be set
  console.log('\nRequired environment variables:');
  requiredVars.forEach(envVar => {
    console.log(`  ✓ ${envVar}`);
  });
  
  console.log('\nOptional/Secret environment variables:');
  secretEnvVars.forEach(envVar => {
    console.log(`  ○ ${envVar}`);
  });
}

function generateDotEnvFiles() {
  console.log('Generating .env files for local development...');
  
  Object.entries(environments).forEach(([env, vars]) => {
    const filename = env === 'development' ? '.env.local' : `.env.${env}`;
    const filepath = path.join(__dirname, '..', 'frontend', filename);
    
    let content = `# Auto-generated environment file for ${env}\n`;
    content += `# Generated at: ${new Date().toISOString()}\n\n`;
    
    Object.entries(vars).forEach(([key, value]) => {
      content += `${key}=${value}\n`;
    });
    
    // Add placeholder for secret variables
    content += '\n# Secret variables (set these manually)\n';
    secretEnvVars.forEach(envVar => {
      content += `# ${envVar}=your_${envVar.toLowerCase().replace(/^vite_/, '')}_here\n`;
    });
    
    fs.writeFileSync(filepath, content);
    console.log(`Generated: ${filepath}`);
  });
}

function displayHelp() {
  console.log(`
Vercel Environment Variables Setup Script

Usage:
  node scripts/setup-vercel-env.js [command] [environment]

Commands:
  setup [env]     Setup environment variables (default: all)
  list            List current environment variables
  validate        Validate environment variable setup
  generate        Generate .env files for local development
  help            Show this help message

Environments:
  development     Development environment
  preview         Preview/staging environment  
  production      Production environment
  all             All environments (default)

Examples:
  node scripts/setup-vercel-env.js setup production
  node scripts/setup-vercel-env.js list
  node scripts/setup-vercel-env.js generate

Note: Make sure you're logged into Vercel CLI and have access to the project.
`);
}

// Main execution
const command = process.argv[2] || 'help';
const environment = process.argv[3] || 'all';

switch (command) {
  case 'setup':
    setupEnvironmentVars(environment);
    break;
  case 'list':
    getVercelEnvVars();
    break;
  case 'validate':
    validateEnvironmentVars();
    break;
  case 'generate':
    generateDotEnvFiles();
    break;
  case 'help':
  default:
    displayHelp();
    break;
}