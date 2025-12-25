# Jump Box Setup - Database Access

## Overview

A cost-effective solution for accessing the RDS database in private subnets.

**Cost**: ~$0.0042/hour = **~$0.25/month** if used 1 hour per week

---

## How It Works

1. **Jump Box**: Small EC2 instance (t4g.nano) in public subnet
2. **SSH Keys**: Stored in S3, downloaded by jump box on startup
3. **Access**: SSH to jump box → SSH tunnel to RDS
4. **Cost Control**: Start only when needed, stop immediately after

---

## Setup (One-Time)

### Step 1: Deploy Infrastructure

```bash
cd ~/oneclicktag-infra
terraform apply
```

This creates:
- EC2 t4g.nano instance (stopped by default)
- S3 bucket for SSH keys
- Security groups for jump box and RDS access

### Step 2: Upload Your SSH Public Key

```bash
cd ~/OneClickTag
npm run jumpbox:upload-keys:dev
```

This uploads `~/.ssh/id_ed25519.pub` by default.

**To use a different key**:
```bash
npm run jumpbox:upload-keys:dev ~/.ssh/id_rsa.pub
```

**To add multiple keys** (for team members):
```bash
# Download current keys
aws s3 cp s3://dev-oneclicktag-jumpbox-keys/authorized_keys authorized_keys

# Add new public keys (one per line)
cat ~/.ssh/teammate_key.pub >> authorized_keys

# Upload back
aws s3 cp authorized_keys s3://dev-oneclicktag-jumpbox-keys/authorized_keys
```

---

## Daily Usage

### Start Jump Box

```bash
npm run jumpbox:start:dev
```

Output shows:
- Public IP address
- SSH tunnel command

### Connect to Database via DBeaver

**Option 1: SSH Tunnel (Recommended)**

1. Open a **separate terminal** and run the SSH tunnel command:
   ```bash
   ssh -L 5433:<RDS_ENDPOINT>:5432 ec2-user@<JUMP_BOX_IP> -N
   ```
   Leave this terminal running.

2. In DBeaver:
   - **Host**: `localhost`
   - **Port**: `5433`
   - **Database**: `oneclicktag`
   - **Username**: `oneclicktag`
   - **Password**: [From AWS Secrets Manager]
   - **SSH**: DISABLED

**Option 2: DBeaver SSH Tunnel**

1. In DBeaver → **SSH Tab**:
   - **Use SSH Tunnel**: ✅ Enabled
   - **Host**: `<JUMP_BOX_IP>` (from start command output)
   - **Port**: `22`
   - **User Name**: `ec2-user`
   - **Authentication Method**: Public Key
   - **Private Key**: `~/.ssh/id_ed25519` (or your key)

2. **Main Tab**:
   - **Host**: `<RDS_ENDPOINT>` (shown in start output)
   - **Port**: `5432`
   - **Database**: `oneclicktag`
   - **Username**: `oneclicktag`
   - **Password**: [From AWS Secrets Manager]

### Stop Jump Box (Save Money!)

```bash
npm run jumpbox:stop:dev
```

**Important**: Always stop the jump box when done to avoid unnecessary charges.

---

## Cost Breakdown

| Usage Pattern | Monthly Cost |
|---|---|
| 1 hour/week | $0.25 |
| 2 hours/week | $0.50 |
| 5 hours/week | $1.25 |
| Always on 24/7 | $3.02 |

**Recommendation**: Start only when needed, stop immediately after.

---

## Available Commands

```bash
# Upload SSH keys
npm run jumpbox:upload-keys:dev
npm run jumpbox:upload-keys:stage
npm run jumpbox:upload-keys:prod

# Start jump box
npm run jumpbox:start:dev
npm run jumpbox:start:stage
npm run jumpbox:start:prod

# Stop jump box
npm run jumpbox:stop:dev
npm run jumpbox:stop:stage
npm run jumpbox:stop:prod
```

---

## Troubleshooting

### "Permission denied (publickey)"

**Fix**: Upload your SSH key to S3
```bash
npm run jumpbox:upload-keys:dev ~/.ssh/id_ed25519.pub
```

Then restart the jump box:
```bash
npm run jumpbox:stop:dev
npm run jumpbox:start:dev
```

### "Connection timeout"

**Check**:
1. Is jump box running? `npm run jumpbox:start:dev`
2. Is your IP allowed? The jump box security group uses `allowed_ip` from terraform.tfvars

### Jump box not found

**Fix**: Deploy infrastructure
```bash
cd ~/oneclicktag-infra
terraform apply
```

---

## Security Notes

- Jump box only accepts SSH from IPs defined in `allowed_ip` variable
- SSH keys stored in private S3 bucket (not publicly accessible)
- RDS remains in private subnets (not exposed to internet)
- Jump box has minimal IAM permissions (only read from S3)

---

## Comparison with Other Solutions

| Solution | Monthly Cost | Complexity | Security |
|---|---|---|---|
| **Jump Box (this)** | $0.25-$3 | Low | High |
| Bastion Host (always-on) | $8-10 | Medium | High |
| RDS Public + IP whitelist | $0 | Low | Medium |
| VPC Peering + Dedicated instance | $50+ | High | High |
| AWS Client VPN | $72+ | High | High |

---

**Last Updated**: December 2025
