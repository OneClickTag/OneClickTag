#!/usr/bin/env ts-node

/**
 * AWS RDS Database Seeding Script with Auto-Discovery
 *
 * Automatically discovers RDS endpoints from AWS and seeds databases
 * You only need to provide AWS credentials - no database URLs needed!
 *
 * Usage:
 *   pnpm seed:rds:dev | pnpm seed:rds:stage | pnpm seed:rds:prod
 *   OR
 *   pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts <environment>
 *
 * Example:
 *   pnpm seed:rds:dev
 *   pnpm seed:rds:stage
 *   pnpm seed:rds:prod
 *
 * Environment variables required:
 *   - AWS_ACCESS_KEY_ID (required)
 *   - AWS_SECRET_ACCESS_KEY (required)
 *   - AWS_REGION (optional, defaults to eu-central-1)
 *
 * Optional: You can still provide DATABASE_URL directly:
 *   - DEV_DATABASE_URL or AWS_RDS_DEV_DATABASE_URL
 *   - STAGE_DATABASE_URL or AWS_RDS_STAGE_DATABASE_URL
 *   - PROD_DATABASE_URL or AWS_RDS_PROD_DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { RDSClient, DescribeDBInstancesCommand, DBInstance } from '@aws-sdk/client-rds';

// Load environment variables
dotenv.config();

const VALID_ENVIRONMENTS = ['dev', 'stage', 'prod'] as const;
type Environment = typeof VALID_ENVIRONMENTS[number];

interface SeedConfig {
  environment: Environment;
  databaseUrl: string;
  source: 'manual' | 'aws-discovery';
}

interface RDSInstanceInfo {
  identifier: string;
  endpoint: string;
  port: number;
  engine: string;
  status: string;
  dbName: string;
}

/**
 * Get AWS credentials from environment
 */
function getAWSCredentials(): { accessKeyId: string; secretAccessKey: string; region: string } {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-central-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      '❌ AWS credentials not found.\n' +
      'Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.'
    );
  }

  return { accessKeyId, secretAccessKey, region };
}

/**
 * Discover RDS instances from AWS
 */
async function discoverRDSInstances(): Promise<RDSInstanceInfo[]> {
  console.log('🔍 Discovering RDS instances from AWS...');

  const credentials = getAWSCredentials();

  const rdsClient = new RDSClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  try {
    const command = new DescribeDBInstancesCommand({});
    const response = await rdsClient.send(command);

    if (!response.DBInstances || response.DBInstances.length === 0) {
      console.log('⚠️  No RDS instances found in region:', credentials.region);
      return [];
    }

    const instances: RDSInstanceInfo[] = response.DBInstances
      .filter((db): db is DBInstance => !!db.DBInstanceIdentifier && !!db.Endpoint?.Address)
      .map((db) => ({
        identifier: db.DBInstanceIdentifier!,
        endpoint: db.Endpoint!.Address!,
        port: db.Endpoint!.Port || 5432,
        engine: db.Engine || 'unknown',
        status: db.DBInstanceStatus || 'unknown',
        dbName: db.DBName || 'postgres',
      }));

    console.log(`✅ Found ${instances.length} RDS instance(s)`);
    return instances;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to discover RDS instances: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Find RDS instance for specific environment
 */
function findRDSForEnvironment(instances: RDSInstanceInfo[], env: Environment): RDSInstanceInfo | null {
  // Try different naming patterns
  const patterns = [
    `${env}-`,                    // dev-rds, stage-rds, prod-rds
    `-${env}-`,                   // oneclicktag-dev-rds
    `-${env}`,                    // oneclicktag-dev
    `${env}`,                     // dev, stage, prod
    `oneclicktag-${env}`,         // oneclicktag-dev
    `oneclicktag${env}`,          // oneclicktagdev
  ];

  for (const pattern of patterns) {
    const found = instances.find(instance =>
      instance.identifier.toLowerCase().includes(pattern.toLowerCase())
    );
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Build database URL from RDS instance info
 */
function buildDatabaseUrl(instance: RDSInstanceInfo, env: Environment): string {
  // Try to get username and password from environment
  const username = process.env[`${env.toUpperCase()}_DB_USERNAME`] ||
                   process.env.DB_USERNAME ||
                   'postgres';

  const password = process.env[`${env.toUpperCase()}_DB_PASSWORD`] ||
                   process.env.DB_PASSWORD ||
                   '';

  const dbName = process.env[`${env.toUpperCase()}_DB_NAME`] ||
                 instance.dbName ||
                 'oneclicktag';

  if (!password) {
    console.log('⚠️  Warning: No database password found. Set DB_PASSWORD or <ENV>_DB_PASSWORD');
    console.log('   Attempting connection without password...');
  }

  const passwordPart = password ? `:${password}` : '';
  return `postgresql://${username}${passwordPart}@${instance.endpoint}:${instance.port}/${dbName}?schema=public`;
}

/**
 * Get database URL for the specified environment
 * First tries manual env vars, then falls back to AWS discovery
 */
async function getDatabaseUrl(env: Environment): Promise<{ url: string; source: 'manual' | 'aws-discovery' }> {
  // First, try to get from environment variables (backward compatible)
  const envVarNames = [
    `${env.toUpperCase()}_DATABASE_URL`,
    `AWS_RDS_${env.toUpperCase()}_DATABASE_URL`,
    `${env.toUpperCase()}_DB_URL`,
  ];

  for (const varName of envVarNames) {
    const url = process.env[varName];
    if (url) {
      console.log(`✅ Found database URL in ${varName}`);
      return { url, source: 'manual' };
    }
  }

  // If not found, try AWS auto-discovery
  console.log('📡 No manual DATABASE_URL found, attempting AWS auto-discovery...');
  console.log('');

  try {
    const instances = await discoverRDSInstances();

    if (instances.length === 0) {
      throw new Error(
        'No RDS instances found. Please either:\n' +
        '  1. Set DATABASE_URL manually in .env, OR\n' +
        '  2. Create RDS instances with naming like: dev-*, stage-*, prod-*'
      );
    }

    // Show all found instances
    console.log('📋 Available RDS instances:');
    instances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.identifier} (${instance.status}) - ${instance.endpoint}`);
    });
    console.log('');

    // Find instance for this environment
    const instance = findRDSForEnvironment(instances, env);

    if (!instance) {
      throw new Error(
        `❌ Could not find RDS instance for ${env} environment.\n` +
        `   Looking for patterns like: ${env}-*, *-${env}-*, *-${env}\n` +
        `   Available instances: ${instances.map(i => i.identifier).join(', ')}\n\n` +
        `   You can either:\n` +
        `   1. Rename your RDS instance to include '${env}' in the identifier\n` +
        `   2. Set ${env.toUpperCase()}_DATABASE_URL manually in .env`
      );
    }

    console.log(`✅ Found RDS instance: ${instance.identifier}`);
    console.log(`   Endpoint: ${instance.endpoint}:${instance.port}`);
    console.log(`   Engine: ${instance.engine}`);
    console.log(`   Status: ${instance.status}`);
    console.log('');

    const url = buildDatabaseUrl(instance, env);
    console.log('✅ Auto-generated database URL');
    console.log('');

    return { url, source: 'aws-discovery' };

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `❌ Failed to auto-discover RDS endpoint:\n${error.message}\n\n` +
        `Fallback: Set ${env.toUpperCase()}_DATABASE_URL manually in .env`
      );
    }
    throw error;
  }
}

/**
 * Validate environment argument
 */
function validateEnvironment(env: string): env is Environment {
  return VALID_ENVIRONMENTS.includes(env as Environment);
}

/**
 * Run Prisma seed with custom database URL
 */
async function seedDatabase(config: SeedConfig): Promise<void> {
  const { environment, databaseUrl, source } = config;

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🌱 Seeding ${environment.toUpperCase()} Database`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`📍 Source: ${source === 'manual' ? 'Manual configuration' : 'AWS Auto-Discovery'}`);
  console.log('');

  // Create Prisma client with custom database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    console.log('');

    // Check if database is already seeded
    console.log('🔍 Checking if database is already seeded...');
    const existingUsers = await prisma.user.count();
    const existingPlans = await prisma.plan.count();
    const existingPages = await prisma.contentPage.count();

    if (existingUsers > 0 || existingPlans > 0 || existingPages > 0) {
      console.log(`⚠️  Database already contains data:`);
      console.log(`   - Users: ${existingUsers}`);
      console.log(`   - Plans: ${existingPlans}`);
      console.log(`   - Content Pages: ${existingPages}`);
      console.log('');
      console.log('💡 Seed data will be updated/upserted (not duplicated)');
      console.log('');
    } else {
      console.log('✅ Database is empty, ready for seeding');
      console.log('');
    }

    // Run the main seed script
    console.log('🌱 Running seed script...');
    console.log('');

    // Run seed via Prisma CLI with custom DATABASE_URL
    execSync('pnpm prisma db seed', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ ${environment.toUpperCase()} Database Seeded Successfully`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Seeded data includes:');
    console.log('   ✓ Admin user (admin@oneclicktag.com)');
    console.log('   ✓ Content pages (About, Terms, Privacy)');
    console.log('   ✓ Pricing plans (Starter, Pro, Enterprise)');
    console.log('   ✓ Landing page content (Hero, Features, CTA)');
    console.log('   ✓ Site settings (Branding, Colors, Meta)');
    console.log('   ✓ Contact page content');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error(`❌ Failed to seed ${environment.toUpperCase()} database`);
    console.error('═══════════════════════════════════════════════════');
    console.error('');

    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', String(error));
    }

    console.error('');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Missing environment argument');
    console.error('');
    console.error('Usage:');
    console.error('  pnpm seed:rds:<environment>');
    console.error('  OR');
    console.error('  pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts <environment>');
    console.error('');
    console.error('Environments:');
    console.error('  - dev    : Development environment');
    console.error('  - stage  : Staging environment');
    console.error('  - prod   : Production environment');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm seed:rds:dev');
    console.error('  pnpm seed:rds:stage');
    console.error('  pnpm ts-node -r tsconfig-paths/register scripts/seed-rds.ts prod');
    console.error('');
    console.error('Required Environment Variables:');
    console.error('  AWS_ACCESS_KEY_ID          - Your AWS access key');
    console.error('  AWS_SECRET_ACCESS_KEY      - Your AWS secret key');
    console.error('  AWS_REGION                 - AWS region (optional, defaults to eu-central-1)');
    console.error('');
    console.error('Optional (for auto-discovered RDS):');
    console.error('  DB_USERNAME                - Database username (defaults to postgres)');
    console.error('  DB_PASSWORD                - Database password');
    console.error('  DB_NAME                    - Database name (defaults to oneclicktag)');
    console.error('  <ENV>_DB_USERNAME          - Environment-specific username');
    console.error('  <ENV>_DB_PASSWORD          - Environment-specific password');
    console.error('  <ENV>_DB_NAME              - Environment-specific database name');
    console.error('');
    console.error('Or provide DATABASE_URL directly (backward compatible):');
    console.error('  DEV_DATABASE_URL           - Full database URL for dev');
    console.error('  STAGE_DATABASE_URL         - Full database URL for stage');
    console.error('  PROD_DATABASE_URL          - Full database URL for prod');
    console.error('');
    process.exit(1);
  }

  const environment = args[0].toLowerCase();

  if (!validateEnvironment(environment)) {
    console.error(`❌ Invalid environment: "${environment}"`);
    console.error('');
    console.error(`Valid environments: ${VALID_ENVIRONMENTS.join(', ')}`);
    console.error('');
    process.exit(1);
  }

  try {
    const { url: databaseUrl, source } = await getDatabaseUrl(environment);

    await seedDatabase({
      environment,
      databaseUrl,
      source,
    });

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('💥 Seeding process failed');

    if (error instanceof Error) {
      console.error('');
      console.error('Error details:');
      console.error(error.message);
    }

    console.error('');
    process.exit(1);
  }
}

// Run the script
main();
