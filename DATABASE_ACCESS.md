# Database Access Guide

## 🎯 Jump Box Solution (Recommended)

Cost-effective on-demand access to RDS database via a small EC2 instance.

**Cost**: **$0.25/month** (if used 1 hour/week) | **Security**: High

---

## 🚀 Quick Start (3 Steps)

### Step 1: Deploy Jump Box Infrastructure

```bash
cd ~/oneclicktag-infra
terraform apply
```

### Step 2: Upload Your SSH Key

```bash
cd ~/OneClickTag
npm run jumpbox:upload-keys:dev
```

### Step 3: Start Jump Box & Connect

```bash
npm run jumpbox:start:dev
```

Follow the instructions shown to connect via DBeaver.

**Don't forget to stop it when done:**
```bash
npm run jumpbox:stop:dev
```

---

## 📖 Full Documentation

See [JUMPBOX_SETUP.md](./JUMPBOX_SETUP.md) for:
- Detailed setup instructions
- DBeaver configuration guide
- Team member access (multiple SSH keys)
- Cost breakdown
- Troubleshooting

---

## 📋 Available Commands

```bash
# Setup (one-time)
npm run jumpbox:upload-keys:dev

# Daily usage
npm run jumpbox:start:dev     # Start jump box
npm run jumpbox:stop:dev      # Stop jump box (save money!)

# Other environments
npm run jumpbox:start:stage
npm run jumpbox:start:prod
```

---

## 💰 Cost Comparison

| Solution | Monthly Cost | Setup Time |
|---|---|---|
| **Jump Box (on-demand)** | $0.25 | 5 minutes |
| Bastion (always-on) | $8-10 | 10 minutes |
| RDS Public Access | $0 | 2 minutes |
| VPC Endpoints (SSM) | $15 | 15 minutes |

---

## ✅ Summary

1. Deploy: `cd ~/oneclicktag-infra && terraform apply`
2. Upload keys: `npm run jumpbox:upload-keys:dev`
3. Start: `npm run jumpbox:start:dev`
4. Connect via DBeaver using instructions shown
5. Stop: `npm run jumpbox:stop:dev`

**Cost**: $0.25/month | **Time**: 5 minutes | **Secure**: ✅

---

**See [JUMPBOX_SETUP.md](./JUMPBOX_SETUP.md) for complete documentation.**
