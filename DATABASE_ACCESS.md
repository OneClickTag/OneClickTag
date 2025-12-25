# Database Access Guide

This guide explains how to connect to the OneClickTag PostgreSQL databases (dev, stage, prod) using DBeaver or any other database client.

## 🔒 Security Note

Our RDS databases are in **private subnets** (not publicly accessible) for security. We use **AWS Systems Manager Session Manager** to create secure tunnels through ECS tasks.

---

## 📋 Prerequisites

### 1. Install AWS CLI

```bash
# Mac
brew install awscli

# Verify
aws --version
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (eu-central-1)
```

### 3. Install AWS Session Manager Plugin

```bash
# Mac
brew install --cask session-manager-plugin

# Verify
session-manager-plugin --version
```

**Alternative installation methods:**
- [Official AWS Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

### 4. Install DBeaver (or any PostgreSQL client)

```bash
# Mac
brew install --cask dbeaver-community

# Or download from:
# https://dbeaver.io/download/
```

---

## 🚀 Quick Start

### Step 1: Open Database Tunnel

From the project root, run:

```bash
# For DEV environment
npm run db:tunnel:dev

# For STAGE environment
npm run db:tunnel:stage

# For PROD environment
npm run db:tunnel:prod
```

**You should see:**
```
================================================
  OneClickTag Database Tunnel
================================================

Environment: dev
Region:      eu-central-1
Local Port:  5433

🔍 Checking prerequisites...
✅ AWS CLI installed
✅ Session Manager plugin installed
✅ AWS credentials configured

🔍 Getting database connection details...
✅ RDS Endpoint: dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com

🔍 Finding running ECS task...
✅ Found task: abc123...

🚀 Starting database tunnel...

================================================
  📊 DBeaver Connection Settings
================================================

Connection Type: PostgreSQL
Host:            localhost
Port:            5433
Database:        oneclicktag
Username:        oneclicktag
Password:        [password displayed here]
SSL:             Disabled

================================================

✅ Tunnel is now active!
⚠️  Keep this terminal open
Press Ctrl+C to stop the tunnel
```

**⚠️ Important: Keep this terminal open while using the database!**

---

### Step 2: Connect with DBeaver

1. **Open DBeaver**
2. **Create New Connection**: `Database` → `New Database Connection` → `PostgreSQL`
3. **Enter Connection Details** (from the terminal output):
   - **Host:** `localhost`
   - **Port:** `5433` (or as shown in terminal)
   - **Database:** `oneclicktag`
   - **Username:** `oneclicktag`
   - **Password:** Copy from terminal output
4. **Click "Test Connection"** → Should succeed ✅
5. **Click "Finish"**

---

## 🎯 How It Works

```
Your Computer (DBeaver)
         ↓
    localhost:5433
         ↓
   AWS SSM Session Manager (secure tunnel)
         ↓
   ECS Task (running container)
         ↓
   RDS PostgreSQL (private subnet)
```

- **No public exposure**: Database stays in private subnet
- **IAM-based authentication**: Uses your AWS credentials
- **Encrypted connection**: All traffic encrypted via AWS SSM
- **Automatic**: Finds running ECS task automatically

---

## 🛠️ Advanced Usage

### Use Different Local Port

If port 5433 is already in use:

```bash
DB_TUNNEL_PORT=5434 npm run db:tunnel:dev
```

Then connect to `localhost:5434` in DBeaver.

### Multiple Environments

You can open tunnels to multiple environments simultaneously:

**Terminal 1:**
```bash
npm run db:tunnel:dev
```

**Terminal 2:**
```bash
DB_TUNNEL_PORT=5434 npm run db:tunnel:stage
```

Now you have:
- DEV database on `localhost:5433`
- STAGE database on `localhost:5434`

### Get Password Only

If you just need the password:

```bash
aws secretsmanager get-secret-value \
  --secret-id dev-oneclicktag-db-password \
  --region eu-central-1 \
  --query SecretString \
  --output text
```

---

## 📊 DBeaver Configuration Tips

### Save Password

In DBeaver connection settings:
1. Go to `Connection` → `Connection Settings`
2. Check ☑️ "Save password"
3. Click "OK"

Next time you won't need to enter the password.

### Auto-Connect

1. Right-click connection → `Edit Connection`
2. Check ☑️ "Connect on startup"
3. DBeaver will auto-connect when you open it (if tunnel is active)

### SQL Editor Settings

Recommended settings for better performance:
1. `Window` → `Preferences` → `Database` → `SQL Editor`
2. Set "Result set max size" to `10000`
3. Enable "Fetch result sets in separate thread"

---

## 🚨 Troubleshooting

### Error: "AWS CLI is not installed"

```bash
brew install awscli
aws --version
```

### Error: "Session Manager plugin is not installed"

```bash
brew install --cask session-manager-plugin
session-manager-plugin --version
```

### Error: "AWS credentials not configured"

```bash
aws configure
# Enter your credentials
aws sts get-caller-identity  # Test
```

### Error: "No running tasks found"

**Cause**: ECS service is not running or has no healthy tasks

**Fix**:
1. Check ECS service status:
   ```bash
   aws ecs describe-services \
     --cluster dev-api-cluster \
     --services dev-api-svc \
     --region eu-central-1
   ```
2. Ensure at least one task is running and healthy

### Error: "Port already in use"

**Cause**: Another tunnel or application is using port 5433

**Fix**:
```bash
# Option 1: Kill existing process
lsof -ti:5433 | xargs kill -9

# Option 2: Use different port
DB_TUNNEL_PORT=5434 npm run db:tunnel:dev
```

### Connection Timeout in DBeaver

**Cause**: Tunnel closed or not running

**Fix**:
1. Ensure tunnel script is still running (don't close the terminal)
2. Check terminal for errors
3. Restart tunnel: `npm run db:tunnel:dev`

### "Cannot connect to localhost:5433"

**Checklist:**
- [ ] Tunnel script is running and shows "Tunnel is now active!"
- [ ] No errors in tunnel terminal
- [ ] DBeaver host is `localhost` (not `127.0.0.1` or database endpoint)
- [ ] DBeaver port matches tunnel port (default: 5433)

---

## 🔐 Security Best Practices

### ✅ DO

- Keep tunnel terminal open only when actively working
- Close tunnel when done: Press `Ctrl+C`
- Use read-only queries when possible
- Test queries on DEV before running on STAGE/PROD
- Keep database passwords secure (don't commit to git)

### ❌ DON'T

- Don't share database passwords via email/Slack
- Don't leave tunnels open overnight
- Don't run destructive queries on PROD without backups
- Don't commit database credentials to git

---

## 📚 Database Information

### Databases by Environment

| Environment | Cluster | Database | Schema |
|-------------|---------|----------|--------|
| DEV | `dev-api-cluster` | `oneclicktag` | `public` |
| STAGE | `stage-api-cluster` | `oneclicktag` | `public` |
| PROD | `prod-api-cluster` | `oneclicktag` | `public` |

### Common Tables

- `User` - User accounts
- `Tenant` - Organizations/tenants
- `Customer` - Customer tracking configurations
- `Tracking` - Tracking tags created
- `GoogleAdsAccount` - Connected Google Ads accounts
- `GA4Property` - Connected Google Analytics properties
- `OAuthToken` - OAuth tokens for Google integrations

### Useful Queries

**Count users:**
```sql
SELECT COUNT(*) FROM "User";
```

**List customers by tenant:**
```sql
SELECT t.name as tenant, c.name as customer, c.website
FROM "Customer" c
JOIN "Tenant" t ON c."tenantId" = t.id;
```

**Check tracking status:**
```sql
SELECT
  c.name as customer,
  t.name as tracking,
  t."trackingType",
  t.status,
  t."createdAt"
FROM "Tracking" t
JOIN "Customer" c ON t."customerId" = c.id
ORDER BY t."createdAt" DESC
LIMIT 10;
```

---

## 🆘 Need Help?

1. **Check script output**: The tunnel script provides detailed error messages
2. **Verify prerequisites**: Ensure AWS CLI, Session Manager plugin, and credentials are set up
3. **Check ECS service**: Ensure the backend ECS service is running
4. **Read this guide**: Most issues are covered in the Troubleshooting section

---

## 💡 Tips for Team Members

### First Time Setup (One-time)

```bash
# 1. Install tools
brew install awscli
brew install --cask session-manager-plugin
brew install --cask dbeaver-community

# 2. Configure AWS
aws configure
# Enter your AWS credentials (ask team lead)

# 3. Test
npm run db:tunnel:dev
# Should show: "✅ Tunnel is now active!"
```

### Daily Workflow

```bash
# Morning: Open tunnel
npm run db:tunnel:dev

# Work in DBeaver (keep terminal open)

# Evening: Close tunnel
# Press Ctrl+C in tunnel terminal
```

---

**Last Updated**: December 2025
