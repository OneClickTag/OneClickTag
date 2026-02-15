# Stape Server-Side GTM Integration Design

## Overview

Add optional server-side Google Tag Manager (sGTM) tracking via Stape as a per-customer toggle alongside the existing client-side GTM approach. OneClickTag owns and manages the Stape account. Customers provide a custom subdomain for first-party cookie benefits.

## Decisions

- **Approach**: Dual-container (client GTM + server GTM), complexity hidden from user
- **Stape account**: OneClickTag-managed, single account provisions containers for all customers
- **Activation**: Per-customer toggle in customer settings
- **DNS**: Custom subdomain required (e.g., `track.customer.com`)
- **GTM API**: Google GTM API used for both client and server container tag/trigger management. Stape API used only for container provisioning and domain management
- **Container naming**: `OneClickTag - {Customer Name}`

## Architecture & Data Flow

### Setup Flow (one-time per customer)

```
1. User toggles "Server-Side Tracking" ON in customer settings
2. User enters custom subdomain (e.g., track.acme.com)
3. Stape API → Create sGTM container "OneClickTag - Acme Corp"
4. Stape API → Add custom domain (track.acme.com)
5. UI shows CNAME instructions: track.acme.com → xxx.stape.io
6. Customer adds CNAME in their DNS provider
7. User clicks "Verify Domain"
8. Stape API → Validate domain
9. Google GTM API → Set up server-side GA4 Client in the container
10. Status: ACTIVE - ready for trackings
```

### Per-Tracking Data Flow (after setup)

```
User clicks button on acme.com
  → Client GTM fires GA4 tag pointing to track.acme.com
    → Stape sGTM receives the event
      → Server-side GA4 tag → Google Analytics
      → Server-side Google Ads tag → Google Ads conversion
```

### What Stays the Same

- Client-side GTM workspace "OneClickTag" still exists
- Same trigger types (CLICK, PAGEVIEW, FORM_SUBMIT, etc.)
- Same Google GTM API patterns for creating tags/triggers
- Existing client-side-only customers unaffected

### What Changes

- Client-side GA4 tags point to Stape URL instead of Google directly (when sGTM enabled)
- New server-side tags created in the Stape-hosted sGTM container
- New Stape API calls for container/domain provisioning

## Database Changes

### New Model: StapeContainer

```prisma
model StapeContainer {
  id                    String   @id @default(cuid())
  customerId            String   @unique
  customer              Customer @relation(fields: [customerId], references: [id])
  stapeContainerId      String   // ID from Stape API
  containerName         String   // "OneClickTag - {Customer Name}"
  serverDomain          String   // "track.acme.com"
  stapeDefaultDomain    String   // "xxx.stape.io"
  status                StapeContainerStatus @default(PENDING)
  domainStatus          StapeDomainStatus @default(PENDING)
  gtmServerContainerId  String?  // Google's server-side container ID
  tenantId              String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId])
}

enum StapeContainerStatus {
  PENDING
  PROVISIONING
  ACTIVE
  FAILED
}

enum StapeDomainStatus {
  PENDING
  VALIDATED
  FAILED
}
```

### Modified Model: Customer

```prisma
model Customer {
  // ...existing fields...
  serverSideEnabled   Boolean  @default(false)
  stapeContainer      StapeContainer?
}
```

### Modified Model: Tracking

```prisma
model Tracking {
  // ...existing fields...
  sgtmTagId       String?   // server-side tag ID
  sgtmTriggerId   String?   // server-side trigger ID
  trackingMode    TrackingMode @default(CLIENT_SIDE)
}

enum TrackingMode {
  CLIENT_SIDE
  SERVER_SIDE
}
```

## Stape API Integration Layer

New service wrapping Stape's REST API:

```
StapeService
  createContainer(customerName) → provisions sGTM container on Stape
  addDomain(containerId, domain) → adds custom subdomain
  validateDomain(containerId, domain) → checks CNAME is set up
  getContainer(containerId) → get container status/details
  deleteContainer(containerId) → cleanup on disconnect
  enableCookieKeeper(containerId) → power-up for first-party cookies
  enableCustomLoader(containerId) → power-up for ad blocker bypass
```

- Auth: Stape API key stored as env var `STAPE_API_KEY`
- Base URL: `https://api.app.stape.io/api/v2`

## Server-Side GTM Tag Creation

When a tracking is created for a server-side customer, the sync job does:

### Client-side container (modified)

1. Create trigger (same as today)
2. Create GA4 tag with `transport_url` pointing to `https://track.customer.com`

### Server-side container (new)

1. Create GA4 Client (to receive incoming events)
2. Create trigger matching the event
3. Create GA4 Event tag (forwards to Google Analytics)
4. Create Google Ads Conversion tag (forwards to Google Ads, if destination includes Ads)

## Customer Setup UX

```
Customer Settings Page:
+------------------------------------------+
|  Google Account: Connected               |
|                                          |
|  Server-Side Tracking: [Toggle OFF/ON]   |
|                                          |
|  When toggled ON:                        |
|  +------------------------------------+  |
|  | Custom Domain Setup                |  |
|  |                                    |  |
|  | Subdomain: [track.customer.com]    |  |
|  |                                    |  |
|  | Add this CNAME record:             |  |
|  | track.customer.com -> xxx.stape.io |  |
|  |                                    |  |
|  | Status: Waiting for DNS...         |  |
|  |         Domain verified!           |  |
|  |                                    |  |
|  | [Verify Domain]                    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Sync Job Changes

### Current executeGTMSync()

1. Create trigger in client GTM
2. Create GA4 tag in client GTM
3. Done

### New executeGTMSync() when serverSideEnabled

1. Create trigger in client GTM
2. Create GA4 tag in client GTM (transport_url -> Stape domain)
3. Create trigger in server-side GTM container
4. Create GA4 server tag in server-side container
5. Create Ads conversion tag in server-side container (if destination includes Ads)
6. Store both client + server IDs in Tracking record
7. Done

Existing trackings created before server-side was enabled stay client-side only.

## Environment Variables

```bash
STAPE_API_KEY=xxx                                    # OneClickTag Stape API key
STAPE_API_BASE_URL=https://api.app.stape.io/api/v2  # Stape API endpoint
STAPE_DEFAULT_PLAN=starter                           # Stape plan for new containers
```

## Sources

- [Stape API Documentation](https://stape.io/helpdesk/documentation/stape-api)
- [Stape API Spec](https://api.app.stape.io/api/doc)
- [Send Data from Web to Server Container](https://stape.io/helpdesk/documentation/send-data-from-web-to-server-container-in-google-tag-manager)
- [sGTM Hosting Provider](https://stape.io/helpdesk/documentation/sgtm-hosting-provider)
