# Secrets Management Guide

This document outlines the secrets required for OneClickTag's CI/CD pipelines and deployment processes.

## 🔑 Required Secrets

### Core Application Secrets

| Secret Name | Environment | Description | Rotation Frequency |
|-------------|-------------|-------------|--------------------|
| `DATABASE_URL` | All | PostgreSQL connection string | 90 days |
| `PROD_DATABASE_URL` | Production | Production database connection | 90 days |
| `STAGING_DATABASE_URL` | Staging | Staging database connection | 90 days |
| `SHADOW_DATABASE_URL` | All | Shadow database for migrations | 90 days |
| `JWT_SECRET` | All | JWT signing secret | 1 year |
| `JWT_REFRESH_SECRET` | All | JWT refresh token secret | 1 year |

### Third-Party Service Secrets

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `VERCEL_TOKEN` | Deployment | Vercel deployment token | Frontend deployment |
| `VERCEL_ORG_ID` | Deployment | Vercel organization ID | Frontend deployment |
| `VERCEL_PROJECT_ID` | Deployment | Vercel project ID | Frontend deployment |
| `GOOGLE_GTM_CLIENT_ID` | Integration | Google Tag Manager OAuth client ID | GTM features |
| `GOOGLE_GTM_CLIENT_SECRET` | Integration | Google Tag Manager OAuth client secret | GTM features |
| `SENTRY_AUTH_TOKEN` | Monitoring | Sentry API token for releases | Error tracking |
| `SENTRY_ORG` | Monitoring | Sentry organization slug | Error tracking |
| `SENTRY_PROJECT` | Monitoring | Sentry project name | Error tracking |

### Infrastructure Secrets

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `AWS_ACCESS_KEY_ID` | Infrastructure | AWS access key for S3 backups | Database backups |
| `AWS_SECRET_ACCESS_KEY` | Infrastructure | AWS secret key for S3 backups | Database backups |
| `AWS_REGION` | Infrastructure | AWS region for resources | Database backups |
| `BACKUP_S3_BUCKET` | Infrastructure | S3 bucket for database backups | Database backups |

### Deployment Secrets

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `PROD_HOST_1` | Deployment | Primary production server IP/domain | Backend deployment |
| `PROD_HOST_2` | Deployment | Secondary production server (optional) | Backend deployment |
| `PROD_HOST_3` | Deployment | Tertiary production server (optional) | Backend deployment |
| `STAGING_HOST` | Deployment | Staging server IP/domain | Staging deployment |
| `PROD_USER` | Deployment | Production server SSH username | Backend deployment |
| `STAGING_USER` | Deployment | Staging server SSH username | Staging deployment |
| `PROD_SSH_KEY` | Deployment | Production server SSH private key | Backend deployment |
| `STAGING_SSH_KEY` | Deployment | Staging server SSH private key | Staging deployment |

### Notification Secrets

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `SLACK_WEBHOOK_URL` | Notifications | General Slack webhook for deployments | All notifications |
| `SLACK_SECURITY_WEBHOOK_URL` | Notifications | Security-specific Slack webhook | Security alerts |
| `SLACK_CRITICAL_WEBHOOK_URL` | Notifications | Critical alerts Slack webhook | Critical issues |
| `SLACK_PUBLIC_WEBHOOK_URL` | Notifications | Public announcements Slack webhook | Maintenance notices |

### Monitoring & Analytics

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `DD_API_KEY` | Monitoring | DataDog API key | Application monitoring |
| `GRAFANA_API_KEY` | Monitoring | Grafana API key | Dashboard updates |
| `GRAFANA_URL` | Monitoring | Grafana instance URL | Dashboard updates |
| `CLOUDFLARE_API_TOKEN` | CDN | Cloudflare API token | Cache management |
| `CLOUDFLARE_ACCOUNT_ID` | CDN | Cloudflare account ID | Worker deployment |
| `CLOUDFLARE_ZONE_ID` | CDN | Cloudflare zone ID | DNS management |

### Security & Compliance

| Secret Name | Purpose | Description | Required For |
|-------------|---------|-------------|--------------|
| `SNYK_TOKEN` | Security | Snyk API token | Security scanning |
| `DEPENDENCY_UPDATE_TOKEN` | Automation | GitHub token for dependency PRs | Automated updates |

### Environment-Specific Frontend Variables

| Secret Name | Environment | Description | Required For |
|-------------|-------------|-------------|--------------|
| `VITE_API_BASE_URL` | Production | Production API base URL | Frontend build |
| `STAGING_API_BASE_URL` | Staging | Staging API base URL | Frontend build |
| `VITE_GTM_CONTAINER_ID` | Production | Google Tag Manager container ID | Analytics |
| `STAGING_GTM_CONTAINER_ID` | Staging | Staging GTM container ID | Analytics |
| `VITE_SENTRY_DSN` | All | Sentry DSN for error tracking | Error reporting |

## 🔐 Secret Management Best Practices

### 1. Secret Storage
- Use GitHub's encrypted secrets for all sensitive data
- Never commit secrets to source code
- Use environment-specific secrets for different deployment targets
- Store secrets in external secret management systems for production

### 2. Access Control
- Limit access to secrets to necessary team members only
- Use least privilege principles
- Regularly audit secret access permissions
- Implement approval processes for secret modifications

### 3. Rotation Schedule
- **Critical Secrets** (Database passwords, JWT secrets): 90 days
- **API Keys**: 6 months
- **SSH Keys**: 1 year
- **Webhooks**: As needed or when compromised

### 4. Secret Validation
- Implement automated validation of secret formats
- Test secret connectivity before deployment
- Monitor for expired or invalid secrets
- Set up alerts for failed secret validations

### 5. Emergency Procedures
- Document secret rotation procedures
- Maintain emergency access procedures
- Implement secret revocation processes
- Plan for secret compromise scenarios

## 📋 Secret Setup Checklist

### Initial Setup
- [ ] Configure all required GitHub secrets
- [ ] Validate secret formats and connectivity
- [ ] Test deployment pipelines with new secrets
- [ ] Document secret sources and rotation schedule
- [ ] Set up monitoring for secret health

### Regular Maintenance
- [ ] Weekly: Review security scan results
- [ ] Monthly: Audit secret access logs
- [ ] Quarterly: Rotate critical secrets
- [ ] Annually: Review and update secret inventory

### Emergency Response
- [ ] Immediate: Revoke compromised secrets
- [ ] Within 1 hour: Generate and deploy new secrets
- [ ] Within 4 hours: Complete impact assessment
- [ ] Within 24 hours: Update documentation and procedures

## 🚨 Security Alerts

### Immediate Action Required If:
- Secrets are found in source code
- High/critical security vulnerabilities detected
- Unauthorized access to secret management systems
- Failed secret validation in production

### Alert Channels
- **Critical**: `#security-alerts` (immediate response required)
- **High**: `#dev-alerts` (response within 4 hours)
- **Medium**: `#security-weekly` (review in weekly security meeting)

## 🛠️ Tools and Integrations

### Secret Scanning Tools
- **TruffleHog**: Advanced secret detection in git history
- **GitLeaks**: Fast secret detection with custom rules
- **GitHub Secret Scanning**: Built-in GitHub secret detection
- **Custom Patterns**: Organization-specific secret patterns

### Monitoring Tools
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Infrastructure and application monitoring
- **Slack**: Real-time notifications and alerts
- **GitHub Actions**: Automated security workflows

## 📞 Support and Contacts

### Security Team
- **Primary Contact**: security@oneclicktag.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Slack**: #security-team

### DevOps Team
- **Primary Contact**: devops@oneclicktag.com
- **Slack**: #devops

### On-Call Rotation
- Current on-call engineer information available in PagerDuty
- Escalation procedures documented in runbooks

## 📚 Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Security Policies](./SECURITY.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [Runbooks](./runbooks/)

---

**Last Updated**: $(date +'%Y-%m-%d')
**Next Review**: $(date -d '+3 months' +'%Y-%m-%d')
**Owner**: Security Team