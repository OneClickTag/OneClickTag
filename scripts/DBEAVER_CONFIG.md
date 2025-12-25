# DBeaver Database Connection Configuration

## ⚠️ SSH Tunnel Issue

**Problem:** AWS Fargate ECS does not support traditional SSH tunneling. The SSM Session Manager port forwarding has limitations with ECS targets.

**Current Status:** `npm run db:tunnel:dev` fails with `TargetNotConnected` error.

---

## ✅ RECOMMENDED SOLUTION: Direct RDS Connection

### Connection Settings:

**Main Tab:**
```
Connection Type: PostgreSQL
Host:            dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com
Port:            5432
Database:        oneclicktag
Authentication:  Database Native
Username:        oneclicktag
Password:        [n59M%U2px%v)=!Ik*lf:IAGF#D$&rS-
```

**SSH Tab:**
```
Use SSH Tunnel: ❌ DISABLED (not available)
```

**SSL Tab:**
```
Use SSL: No (optional, can enable with RDS certificate)
```

### Required Security Group Rule:

To make this work, temporarily add your IP to the RDS security group:

```bash
# Get your IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Get RDS security group
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier dev-oneclicktag-db \
  --region eu-central-1 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

# Add temporary rule (revoke after done)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --cidr ${MY_IP}/32 \
  --region eu-central-1

# When done, revoke it:
# aws ec2 revoke-security-group-ingress \
#   --group-id $RDS_SG \
#   --protocol tcp \
#   --port 5432 \
#   --cidr ${MY_IP}/32 \
#   --region eu-central-1
```

---

## 🔧 ALTERNATIVE: Deploy EC2 Bastion Host

If you want proper SSH tunneling, deploy a bastion host.

### Add to Terraform (`bastion.tf`):

```hcl
# SSH Key Pair (upload your public key first)
resource "aws_key_pair" "bastion" {
  key_name   = "${var.env_name}-bastion-key"
  public_key = file("~/.ssh/id_rsa.pub")  # or your key path
}

# Bastion Security Group
resource "aws_security_group" "bastion_sg" {
  name   = "${var.env_name}-bastion-sg"
  vpc_id = aws_vpc.main.id

  # SSH from your IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_IP/32"]  # Replace with your IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Bastion Instance
resource "aws_instance" "bastion" {
  ami                    = "ami-0084a47cc718c111a"  # Amazon Linux 2023 eu-central-1
  instance_type          = "t3.micro"
  key_name              = aws_key_pair.bastion.key_name
  subnet_id             = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]

  tags = {
    Name = "${var.env_name}-bastion"
  }
}

# Allow bastion to access RDS
resource "aws_security_group_rule" "rds_from_bastion" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion_sg.id
  security_group_id        = aws_security_group.rds_sg.id
}

output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}
```

### Then in DBeaver:

**SSH Tab:**
```
Use SSH Tunnel: ✅ ENABLED
SSH Host:        <BASTION_PUBLIC_IP>
SSH Port:        22
SSH User:        ec2-user
Authentication:  Public Key
Private Key:     ~/.ssh/id_rsa (your SSH key)
```

**Main Tab:**
```
Host:     dev-oneclicktag-db.c9gqoeq2qqtd.eu-central-1.rds.amazonaws.com
Port:     5432
Database: oneclicktag
Username: oneclicktag
Password: [n59M%U2px%v)=!Ik*lf:IAGF#D$&rS-
```

---

## 📝 Current Script Outputs

Run this script anytime to get connection details:

```bash
./scripts/db-info.sh dev
```

---

## 🐛 Why SSM Tunnel Doesn't Work

The `npm run db:tunnel:dev` script fails because:

1. **SSM Session Manager** with ECS Fargate has limited support
2. **Port forwarding to remote hosts** (`AWS-StartPortForwardingSessionToRemoteHost`) doesn't work with `ecs:` targets
3. **AWS limitation** - Fargate doesn't register with SSM the same way EC2 does

**References:**
- [AWS ECS Exec Limitations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- [SSM Port Forwarding](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-start-port-forwarding)

---

## ✅ Quick Start (Recommended)

1. **Option A** - Direct connection (fastest):
   ```bash
   # Add your IP to RDS security group (see command above)
   # Then connect in DBeaver with direct RDS settings
   ```

2. **Option B** - Deploy bastion host:
   ```bash
   cd ~/oneclicktag-infra
   # Add bastion.tf config above
   terraform apply
   # Use SSH tunnel settings in DBeaver
   ```
