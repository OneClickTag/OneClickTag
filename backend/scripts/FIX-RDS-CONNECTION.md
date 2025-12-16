# 🔧 Fix RDS Connection Issues

## Problem

```
Can't reach database server at `dev-oneclicktag-db...rds.amazonaws.com:5432`
```

**Root Cause**: Your IP address is not whitelisted in the RDS security group.

---

## ✅ Solution 1: Whitelist Your IP in AWS Console (Recommended)

### Step 1: Get Your Current IP

```bash
curl -4 ifconfig.me
# Output: 123.456.789.012 (your public IP)
```

### Step 2: Update RDS Security Group

1. **Go to AWS RDS Console**:
   - https://console.aws.amazon.com/rds/
   - Region: `eu-central-1`

2. **Find Your Database**:
   - Click on `dev-oneclicktag-db`
   - Scroll to "Connectivity & security"
   - Click on the VPC security group link (e.g., `sg-xxxxx`)

3. **Edit Inbound Rules**:
   - Click "Edit inbound rules"
   - Click "Add rule"
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Custom → `YOUR_IP/32` (e.g., `123.456.789.012/32`)
   - **Description**: "My local machine"
   - Click "Save rules"

### Step 3: Test Connection

```bash
# Test with psql
psql "postgresql://postgres:YOUR_PASSWORD@dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com:5432/oneclicktag"

# Or test with telnet
telnet dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com 5432
```

### Step 4: Run Seeding Again

```bash
pnpm seed:rds:dev
```

---

## ✅ Solution 2: Use AWS CLI to Whitelist Your IP

```bash
# Get your IP
MY_IP=$(curl -4 -s ifconfig.me)
echo "Your IP: $MY_IP"

# Get security group ID from RDS
SG_ID=$(aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

echo "Security Group: $SG_ID"

# Add your IP to security group
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr ${MY_IP}/32 \
  --region eu-central-1

echo "✅ Your IP ($MY_IP) has been whitelisted"
```

---

## 🗄️ Connect with DBeaver

### Step 1: Open DBeaver

1. Open DBeaver
2. Click "New Database Connection" (or `Ctrl+Shift+N` / `Cmd+Shift+N`)

### Step 2: Configure Connection

**Basic Settings:**
- **Database**: PostgreSQL
- **Host**: `dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database**: `oneclicktag` (or check your RDS instance)
- **Username**: `postgres` (or check your RDS master username)
- **Password**: Your DB password (from `.env` file: `DB_PASSWORD`)

**Connection Settings (Optional but Recommended):**
- Click "SSH" tab → Leave unchecked (not using SSH tunnel)
- Click "SSL" tab → Select "require" if RDS has SSL enabled
- Click "Test Connection" button

### Step 3: If Connection Fails

**Error: Timeout or "Connection refused"**
→ Security group issue (follow Solution 1 or 2 above)

**Error: "password authentication failed"**
→ Wrong username or password. Check your RDS master username and password

**Error: "database does not exist"**
→ Database name is wrong. Check RDS instance for actual DB name

---

## 🔐 Get RDS Master Username & Database Name

```bash
# Get RDS master username
aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].MasterUsername' \
  --output text

# Get database name
aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].DBName' \
  --output text

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

---

## ⚡ Quick DBeaver Connection String

Once your IP is whitelisted, use this in DBeaver:

```
Host: dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com
Port: 5432
Database: oneclicktag (or postgres)
Username: postgres (or your master username)
Password: [your DB_PASSWORD from .env]
```

---

## 🚀 After Whitelisting - Run Seed

```bash
cd backend

# Method 1: Via DBeaver SQL Console
# 1. Connect with DBeaver
# 2. Open SQL console
# 3. Copy/paste seed SQL commands (if you have them)

# Method 2: Via our script (recommended)
pnpm seed:rds:dev
```

---

## 🔍 Troubleshooting

### Check if RDS is Running

```bash
aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

# Should output: "available"
```

### Check Security Group Rules

```bash
# Get security group ID
SG_ID=$(aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

# View current rules
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region eu-central-1 \
  --query 'SecurityGroups[0].IpPermissions'
```

### Test Raw Connection

```bash
# Test with nc (netcat)
nc -zv dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com 5432

# Test with telnet
telnet dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com 5432
```

---

## 🔒 Security Best Practices

### For Development
```bash
# Whitelist your specific IP
# Good: 123.456.789.012/32
```

### For Production (Restricted)
```bash
# Only whitelist specific IPs or VPC ranges
# Never use 0.0.0.0/0 for production!
```

### For CI/CD (GitHub Actions, etc.)
```bash
# Use GitHub Actions IP ranges or NAT gateway
# Or run seeding from within VPC (ECS task)
```

---

## 🎯 Common Issues

### "Connection timed out"
**Cause**: Security group doesn't allow your IP
**Fix**: Add your IP to security group (Solution 1 or 2)

### "No route to host"
**Cause**: RDS is in private subnet or VPC has no internet gateway
**Fix**: Either:
1. Use VPN/bastion host to access private RDS
2. Make RDS publicly accessible (dev only!)
3. Run seeding from within VPC (ECS task)

### "Password authentication failed"
**Cause**: Wrong username or password
**Fix**:
1. Get master username from RDS console
2. Use correct password from Secrets Manager or your notes
3. Reset master password if forgotten (AWS RDS Console)

### "Database does not exist"
**Cause**: Database name is wrong
**Fix**:
1. Check actual DB name in RDS console
2. Update `DB_NAME` in `.env`
3. Or connect to default `postgres` database

---

## 📋 Complete Setup Checklist

- [ ] Got your public IP: `curl ifconfig.me`
- [ ] Added IP to RDS security group (port 5432)
- [ ] RDS status is "available"
- [ ] Tested connection with `telnet` or `nc`
- [ ] Verified master username and DB name
- [ ] Updated `.env` with correct `DB_PASSWORD`
- [ ] Connected successfully with DBeaver
- [ ] Ran seeding: `pnpm seed:rds:dev`

---

## 🆘 Still Can't Connect?

### Check These:

1. **RDS Public Accessibility**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier dev-oneclicktag-db \
     --region eu-central-1 \
     --query 'DBInstances[0].PubliclyAccessible'
   ```
   - Should be `true` for external connections
   - If `false` and you can't change it:
     - Use VPN/bastion host
     - Or run seeding from within VPC (ECS task)

2. **VPC Route Table**
   - VPC must have internet gateway
   - Route table must have route to 0.0.0.0/0 via igw

3. **Network ACLs**
   - Network ACLs must allow inbound port 5432
   - Network ACLs must allow outbound ephemeral ports

---

## 💡 Alternative: Run Seeding from EC2/ECS

If you can't connect locally due to VPC restrictions:

```bash
# Option 1: SSH to EC2 in same VPC
ssh -i your-key.pem ec2-user@your-ec2-ip
cd /path/to/backend
pnpm seed:rds:dev

# Option 2: Use GitHub Actions (seed-database.yml)
# Already configured! Just trigger the workflow:
# 1. Go to GitHub Actions
# 2. Select "Seed Database" workflow
# 3. Run workflow → Choose environment
```

The GitHub Actions workflow runs seeding as an ECS task inside your VPC, so it bypasses the IP whitelist requirement!

---

**Quick Fix Summary:**
1. Get your IP: `curl ifconfig.me`
2. Whitelist it in RDS security group (port 5432)
3. Test: `telnet dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com 5432`
4. Run: `pnpm seed:rds:dev`
