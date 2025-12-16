# 🚀 Seed Database via GitHub Actions (Runs Inside VPC)

## ⚡ The Easiest Solution - No Local Connection Needed!

Since your RDS is **not publicly accessible** (secure setup!), the easiest way to seed is using the existing GitHub Actions workflow that runs **inside your VPC via ECS**.

---

## 🎯 How to Run

### Method 1: Via GitHub UI (Easiest)

1. **Go to your GitHub repository**
   - https://github.com/YOUR_ORG/OneClickTag

2. **Navigate to Actions tab**
   - Click "Actions" at the top

3. **Select "Seed Database" workflow**
   - Look for "Seed Database" in the left sidebar
   - Click on it

4. **Run workflow**
   - Click "Run workflow" button (top right)
   - Select environment from dropdown:
     - `dev` - Development database
     - `stage` - Staging database
     - `prod` - Production database
   - Click green "Run workflow" button

5. **Monitor progress**
   - Workflow will appear in the list
   - Click on it to see real-time logs
   - Wait ~2-5 minutes for completion

6. **Check results**
   - ✅ Green checkmark = Success!
   - ❌ Red X = Failed (check logs)

---

## 📋 What Happens Behind the Scenes

```
1. GitHub Actions runner starts
   ↓
2. Connects to AWS with your credentials
   ↓
3. Finds your ECS cluster and task definition
   ↓
4. Runs ECS Fargate task INSIDE your VPC
   ↓
5. Task runs: `pnpm prisma db seed`
   ↓
6. Seeds database (can access RDS - same VPC!)
   ↓
7. Reports success/failure
```

**Key Point**: The seeding runs **inside your VPC**, so it can access your private RDS instance without making it publicly accessible. ✅

---

## 🔧 Prerequisites

### Required GitHub Secrets

Make sure these secrets are set in your repository:

**Go to**: Repository Settings → Secrets and variables → Actions

**Required secrets:**
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

**Check if set:**
```bash
# These should already be configured if your deploy workflows work
```

---

## 📊 Example Output

```
🌱 Running seed task for dev...

✅ Found task definition: arn:aws:ecs:eu-central-1:xxx:task-definition/dev-api:123
✅ Network config: subnets=subnet-xxx, security_groups=sg-xxx
✅ Task override created
✅ Seed task started: arn:aws:ecs:eu-central-1:xxx:task/dev-api-cluster/abc123

⏳ Waiting for seed task to complete...

✅ Seed task completed
🔍 Checking task exit code...
Exit code: 0
✅ Seed task succeeded!

✅ Database seeded successfully for dev!

📋 Seeds include:
   - Admin user (admin@oneclicktag.com)
   - Content pages (About, Terms, Privacy)
   - Pricing plans (Starter, Pro, Enterprise)
   - Landing page content (Hero, Features, CTA)
   - Site settings (Branding, Colors, Meta)
   - Contact page content
```

---

## 🐛 Troubleshooting

### "Could not find task definition for service"

**Cause**: ECS service doesn't exist for that environment

**Check**:
```bash
aws ecs list-services \
  --cluster dev-api-cluster \
  --region eu-central-1
```

**Fix**: Make sure your infrastructure is deployed first

---

### "Seed task failed with exit code: 1"

**Cause**: Seeding script had an error

**Check CloudWatch Logs**:
1. Go to AWS CloudWatch Console
2. Navigate to: `/ecs/dev-api` log group
3. Find the latest log stream (with seed task timestamp)
4. Check error messages

**Common issues**:
- Database doesn't exist
- Prisma schema not generated
- Environment variables missing

---

### "Task ARN is None"

**Cause**: Failed to start ECS task

**Possible reasons**:
- No capacity in ECS cluster
- Network configuration issue
- Task definition doesn't exist

**Fix**:
```bash
# Check ECS cluster status
aws ecs describe-clusters \
  --clusters dev-api-cluster \
  --region eu-central-1

# Check task definition exists
aws ecs list-task-definitions \
  --family-prefix dev-api \
  --region eu-central-1
```

---

## 💡 Advantages of This Method

✅ **No local setup needed** - Works from anywhere
✅ **No IP whitelisting** - Runs inside VPC
✅ **No RDS public access** - Keeps database secure
✅ **Audit trail** - All runs logged in GitHub
✅ **Easy to use** - Just click a button
✅ **Safe** - Uses existing production-ready infrastructure
✅ **Fast** - Usually completes in 2-5 minutes

---

## 🔄 Comparison: GitHub Actions vs Local

| Feature | GitHub Actions | Local Script |
|---------|---------------|--------------|
| **Setup Complexity** | None (already done) | Need IP whitelist or RDS public |
| **Security** | ✅ Secure (inside VPC) | ⚠️ Requires public access or VPN |
| **Access Requirements** | GitHub account | AWS credentials + network access |
| **Audit Trail** | ✅ Full logs in GitHub | ❌ Only local logs |
| **Works From** | Anywhere | Only whitelisted IPs |
| **Best For** | All environments | Local development |

---

## 🎓 Step-by-Step Visual Guide

### 1. Go to Actions Tab
```
GitHub Repo → Actions (top menu)
```

### 2. Select Workflow
```
Left sidebar → "Seed Database"
```

### 3. Run Workflow
```
Right side → "Run workflow" button
↓
Choose environment: dev/stage/prod
↓
Click "Run workflow"
```

### 4. Monitor
```
Watch real-time logs
Wait for completion (2-5 min)
Check for green ✅ or red ❌
```

---

## 🔐 Security Notes

- ✅ Workflow uses existing ECS infrastructure
- ✅ Runs inside your VPC (secure)
- ✅ Uses IAM roles (no credentials in code)
- ✅ Logs available for audit
- ✅ Can only be triggered by authorized users

---

## 📞 When to Use This vs Local Script

### Use GitHub Actions When:
- ✅ RDS is not publicly accessible (like yours!)
- ✅ You don't want to whitelist your IP
- ✅ You want audit logs
- ✅ You want consistent environment
- ✅ You're seeding production (safer)

### Use Local Script When:
- ✅ RDS is publicly accessible
- ✅ You're rapidly iterating/testing
- ✅ You need to debug seeding issues
- ✅ GitHub Actions is down (rare)

---

## 🚀 Quick Start Commands

Since you have the workflow already, just:

1. **Open browser**
   ```
   https://github.com/YOUR_ORG/OneClickTag/actions
   ```

2. **Find "Seed Database"** in left sidebar

3. **Click "Run workflow"**

4. **Select environment**: `dev`

5. **Click green "Run workflow"** button

6. **Wait ~2 minutes**

7. **Done!** ✅

---

## 📋 Workflow File Location

```
.github/workflows/seed-database.yml
```

**Already configured!** No changes needed.

---

## 🎉 Recommended Approach

For your setup (private RDS), **GitHub Actions is the best way**:

1. Most secure (no public access needed)
2. Easiest to use (just click button)
3. Works from anywhere
4. Already set up and tested
5. Production-ready

---

**Next Step**: Go to GitHub Actions and run the workflow! 🚀

**URL**: https://github.com/YOUR_USERNAME/OneClickTag/actions/workflows/seed-database.yml
