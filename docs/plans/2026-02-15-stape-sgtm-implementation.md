# Stape Server-Side GTM Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional server-side GTM tracking via Stape as a per-customer toggle, using Stape API for container provisioning and Google GTM API for tag/trigger management in server-side containers.

**Architecture:** OneClickTag manages a single Stape account. When a customer enables server-side tracking, a Stape sGTM container is provisioned via the Stape REST API, a custom subdomain is configured, and subsequent tracking creation uses the Google GTM API to create both client-side tags (pointing to the Stape URL) and server-side tags in the sGTM container.

**Tech Stack:** Stape REST API (v2), Google Tag Manager API (v2), Prisma ORM, Next.js API routes, React + Shadcn UI

**Design doc:** `docs/plans/2026-02-15-stape-sgtm-design.md`

---

## Task 1: Database Schema - Add Stape Models

**Files:**
- Modify: `nextjs/prisma/schema.prisma` (after line 139, Customer model; after line 353, Tracking model; after line 451, enums)

**Step 1: Add enums and StapeContainer model to Prisma schema**

Add after the `TrackingDestination` enum (line 451):

```prisma
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

enum TrackingMode {
  CLIENT_SIDE
  SERVER_SIDE
}
```

Add after the `Customer` model closing brace (after line 139):

```prisma
model StapeContainer {
  id                    String               @id @default(cuid())
  customerId            String               @unique
  customer              Customer             @relation(fields: [customerId], references: [id], onDelete: Cascade)
  stapeContainerId      String               // ID returned from Stape API
  containerName         String               // "OneClickTag - {Customer Name}"
  serverDomain          String               // "track.acme.com" (customer's custom subdomain)
  stapeDefaultDomain    String               // "xxx.stape.io" (Stape-assigned URL)
  status                StapeContainerStatus @default(PENDING)
  domainStatus          StapeDomainStatus    @default(PENDING)
  gtmServerContainerId  String?              // Google's server-side container ID (from GTM API)
  gtmServerAccountId    String?              // Google's account ID for the server container
  gtmServerWorkspaceId  String?              // Workspace ID in the server container
  tenantId              String
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@index([tenantId])
  @@index([customerId])
  @@map("stape_containers")
}
```

Add to the `Customer` model (after line 119, after `siteCredentials`):

```prisma
  // Server-Side Tracking (Stape)
  serverSideEnabled Boolean         @default(false)
  stapeContainer    StapeContainer?
```

Add to the `Tracking` model (after line 334, after `selectorConfidence`):

```prisma
  // Server-side GTM fields (Stape)
  trackingMode    TrackingMode @default(CLIENT_SIDE)
  sgtmTriggerId   String?      // Server-side trigger ID
  sgtmTagId       String?      // Server-side GA4 tag ID
  sgtmTagIdAds    String?      // Server-side Google Ads tag ID
```

**Step 2: Generate and apply migration**

Run: `cd /Users/orharazi/OneClickTag/nextjs && npx prisma migrate dev --name add_stape_server_side_tracking`
Expected: Migration created and applied, Prisma client regenerated.

**Step 3: Commit**

```bash
git add nextjs/prisma/schema.prisma nextjs/prisma/migrations/
git commit -m "feat: add Stape server-side tracking database schema"
```

---

## Task 2: Stape API Service

**Files:**
- Create: `nextjs/src/lib/stape/client.ts`
- Create: `nextjs/src/lib/stape/types.ts`

**Step 1: Create Stape types**

Create `nextjs/src/lib/stape/types.ts`:

```typescript
export interface StapeContainerCreateInput {
  name: string;
  plan?: string;
}

export interface StapeContainerResponse {
  id: string;
  name: string;
  status: string;
  domain: string;         // default stape domain (xxx.stape.io)
  gtmContainerId?: string; // Google server-side container ID
}

export interface StapeDomainInput {
  domain: string;
}

export interface StapeDomainResponse {
  id: string;
  domain: string;
  status: string;         // 'pending', 'validated', 'failed'
  cnameTarget: string;    // what the CNAME should point to
}

export interface StapeDomainValidationResponse {
  isValid: boolean;
  domain: string;
  status: string;
}
```

**Step 2: Create Stape API client**

Create `nextjs/src/lib/stape/client.ts`:

```typescript
import type {
  StapeContainerCreateInput,
  StapeContainerResponse,
  StapeDomainInput,
  StapeDomainResponse,
  StapeDomainValidationResponse,
} from './types';

const STAPE_API_BASE_URL = process.env.STAPE_API_BASE_URL || 'https://api.app.stape.io/api/v2';
const STAPE_API_KEY = process.env.STAPE_API_KEY || '';

async function stapeRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!STAPE_API_KEY) {
    throw new Error('STAPE_API_KEY environment variable is not configured');
  }

  const url = `${STAPE_API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STAPE_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Stape API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Create a new sGTM container on Stape.
 */
export async function createStapeContainer(
  input: StapeContainerCreateInput
): Promise<StapeContainerResponse> {
  return stapeRequest<StapeContainerResponse>('/containers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Get a Stape container by ID.
 */
export async function getStapeContainer(
  containerId: string
): Promise<StapeContainerResponse> {
  return stapeRequest<StapeContainerResponse>(`/containers/${containerId}`);
}

/**
 * Delete a Stape container.
 */
export async function deleteStapeContainer(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: 'Customer disconnected' }),
  });
}

/**
 * Add a custom domain to a Stape container.
 */
export async function addStapeDomain(
  containerId: string,
  input: StapeDomainInput
): Promise<StapeDomainResponse> {
  return stapeRequest<StapeDomainResponse>(
    `/containers/${containerId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Validate a custom domain (check CNAME is set up correctly).
 */
export async function validateStapeDomain(
  containerId: string,
  domainId: string
): Promise<StapeDomainValidationResponse> {
  return stapeRequest<StapeDomainValidationResponse>(
    `/containers/${containerId}/domains/${domainId}/revalidate`,
    { method: 'POST' }
  );
}

/**
 * Enable Cookie Keeper power-up (extends first-party cookie lifetime).
 */
export async function enableCookieKeeper(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}/power-ups/cookie-keeper`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  });
}

/**
 * Enable Custom Loader power-up (helps bypass ad blockers).
 */
export async function enableCustomLoader(
  containerId: string
): Promise<void> {
  await stapeRequest(`/containers/${containerId}/power-ups/custom-loader`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  });
}
```

**Step 3: Commit**

```bash
git add nextjs/src/lib/stape/
git commit -m "feat: add Stape API client service"
```

---

## Task 3: Server-Side GTM Helper Functions

**Files:**
- Modify: `nextjs/src/lib/google/gtm.ts` (add server-side tag creation helpers)

**Step 1: Add server-side tag creation functions**

Add to end of `nextjs/src/lib/google/gtm.ts`:

```typescript
/**
 * Create a GA4 Client in a server-side GTM container.
 * This client receives incoming GA4 requests from the web container.
 */
export async function createGA4Client(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<tagmanager_v2.Schema$Client> {
  const response = await gtm.accounts.containers.workspaces.clients.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: 'GA4 Client',
      type: 'gaaw', // GA4 server-side client
    },
  });
  return response.data;
}

/**
 * Create a server-side GA4 Event tag.
 * This tag forwards events received by the server container to GA4.
 */
export async function createServerGA4Tag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    measurementId: string;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: tag.name,
      type: 'sgtmgaaw', // Server-side GA4 tag type
      parameter: [
        {
          type: 'TEMPLATE',
          key: 'measurementId',
          value: tag.measurementId,
        },
      ],
      firingTriggerId: tag.firingTriggerId,
    },
  });
  return response.data;
}

/**
 * Create a server-side Google Ads Conversion tag.
 */
export async function createServerAdsConversionTag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    conversionId: string;
    conversionLabel: string;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: tag.name,
      type: 'sgtmgacn', // Server-side Google Ads conversion tag
      parameter: [
        { type: 'TEMPLATE', key: 'conversionId', value: tag.conversionId },
        { type: 'TEMPLATE', key: 'conversionLabel', value: tag.conversionLabel },
      ],
      firingTriggerId: tag.firingTriggerId,
    },
  });
  return response.data;
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/google/gtm.ts
git commit -m "feat: add server-side GTM tag creation helpers"
```

---

## Task 4: Stape Container Provisioning API Route

**Files:**
- Create: `nextjs/src/app/api/customers/[id]/stape/route.ts`

**Step 1: Create the Stape setup API endpoint**

This endpoint handles: enabling server-side tracking, creating the Stape container, adding/validating domain.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import {
  createStapeContainer,
  addStapeDomain,
  validateStapeDomain,
  enableCookieKeeper,
  getStapeContainer,
  deleteStapeContainer,
} from '@/lib/stape/client';

// POST: Enable server-side tracking and provision Stape container
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { serverDomain } = body as { serverDomain: string };

    if (!serverDomain) {
      return NextResponse.json(
        { error: 'serverDomain is required (e.g., track.yoursite.com)' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer must be connected to Google before enabling server-side tracking' },
        { status: 400 }
      );
    }

    if (customer.stapeContainer) {
      return NextResponse.json(
        { error: 'Server-side tracking is already configured for this customer' },
        { status: 409 }
      );
    }

    // 1. Create Stape sGTM container
    const containerName = `OneClickTag - ${customer.fullName}`;
    const stapeContainer = await createStapeContainer({
      name: containerName,
    });

    // 2. Add custom domain
    const domainResult = await addStapeDomain(stapeContainer.id, {
      domain: serverDomain,
    });

    // 3. Enable Cookie Keeper power-up (non-blocking)
    try {
      await enableCookieKeeper(stapeContainer.id);
    } catch (error) {
      console.warn('Failed to enable Cookie Keeper:', error);
    }

    // 4. Save to database
    const stapeRecord = await prisma.stapeContainer.create({
      data: {
        customerId: customer.id,
        stapeContainerId: stapeContainer.id,
        containerName,
        serverDomain,
        stapeDefaultDomain: stapeContainer.domain,
        status: 'PROVISIONING',
        domainStatus: 'PENDING',
        gtmServerContainerId: stapeContainer.gtmContainerId || null,
        tenantId: session.tenantId,
      },
    });

    // 5. Enable server-side on customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: { serverSideEnabled: true },
    });

    return NextResponse.json({
      stapeContainer: stapeRecord,
      cnameTarget: domainResult.cnameTarget || stapeContainer.domain,
      message: `Add a CNAME record: ${serverDomain} -> ${domainResult.cnameTarget || stapeContainer.domain}`,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stape setup error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Get Stape container status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      serverSideEnabled: customer.serverSideEnabled,
      stapeContainer: customer.stapeContainer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Disable server-side tracking and cleanup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.stapeContainer) {
      // Delete from Stape (non-blocking)
      try {
        await deleteStapeContainer(customer.stapeContainer.stapeContainerId);
      } catch (error) {
        console.warn('Failed to delete Stape container:', error);
      }

      // Delete from database
      await prisma.stapeContainer.delete({
        where: { id: customer.stapeContainer.id },
      });
    }

    // Disable server-side on customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: { serverSideEnabled: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/stape/
git commit -m "feat: add Stape container provisioning API routes"
```

---

## Task 5: Domain Validation API Route

**Files:**
- Create: `nextjs/src/app/api/customers/[id]/stape/validate-domain/route.ts`

**Step 1: Create domain validation endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import { validateStapeDomain } from '@/lib/stape/client';

// POST: Validate that the customer's CNAME record is set up correctly
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.stapeContainer) {
      return NextResponse.json(
        { error: 'No Stape container configured for this customer' },
        { status: 400 }
      );
    }

    const stape = customer.stapeContainer;

    // Call Stape API to validate the domain
    const validation = await validateStapeDomain(
      stape.stapeContainerId,
      stape.serverDomain
    );

    // Update domain status in database
    const newDomainStatus = validation.isValid ? 'VALIDATED' : 'FAILED';
    const newContainerStatus = validation.isValid ? 'ACTIVE' : stape.status;

    await prisma.stapeContainer.update({
      where: { id: stape.id },
      data: {
        domainStatus: newDomainStatus,
        status: newContainerStatus,
      },
    });

    return NextResponse.json({
      isValid: validation.isValid,
      domain: stape.serverDomain,
      domainStatus: newDomainStatus,
      containerStatus: newContainerStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Domain validation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/stape/validate-domain/
git commit -m "feat: add Stape domain validation API route"
```

---

## Task 6: Modify Sync Worker for Server-Side Tracking

**Files:**
- Modify: `nextjs/src/lib/queue/sync.ts` (lines 10-114, executeGTMSync function)

**Step 1: Update executeGTMSync to handle server-side tracking**

The key changes:
1. Check if customer has `serverSideEnabled`
2. If yes, modify client-side GA4 tag to point `transport_url` to Stape domain
3. Create server-side trigger + tags in the sGTM container

Modify `executeGTMSync` in `nextjs/src/lib/queue/sync.ts`. After line 2 (imports), add:

```typescript
import {
  createServerGA4Tag,
  createServerAdsConversionTag,
  createGA4Client,
} from '@/lib/google/gtm';
```

Replace the `if (action === 'create')` block (lines 71-98) with:

```typescript
    if (action === 'create') {
      // Get customer's GA4 measurement ID for the tag
      const ga4Property = await prisma.gA4Property.findFirst({
        where: { customerId, tenantId, isActive: true },
        select: { measurementId: true },
      });
      const measurementId = ga4Property?.measurementId || undefined;

      // Create trigger based on tracking type (same for both modes)
      const trigger = await createTriggerForTracking(gtm, accountId, containerId, workspaceId, tracking);

      // Check if customer has server-side tracking enabled
      const stapeContainer = await prisma.stapeContainer.findUnique({
        where: { customerId },
      });
      const isServerSide = customer.serverSideEnabled && stapeContainer?.status === 'ACTIVE';

      // Create client-side tag
      const tag = await createTagForTracking(
        gtm, accountId, containerId, workspaceId, tracking, trigger.triggerId!, measurementId,
        isServerSide ? `https://${stapeContainer!.serverDomain}` : undefined
      );

      // Server-side GTM: create tags in the sGTM container
      let sgtmTriggerId: string | undefined;
      let sgtmTagId: string | undefined;
      let sgtmTagIdAds: string | undefined;

      if (isServerSide && stapeContainer!.gtmServerContainerId && stapeContainer!.gtmServerAccountId) {
        const serverContainerId = stapeContainer!.gtmServerContainerId;
        const serverAccountId = stapeContainer!.gtmServerAccountId;

        // Get or create workspace in server container
        const serverWorkspaceId = await getOrCreateWorkspace(gtm, serverAccountId, serverContainerId);

        // Store workspace ID if not saved yet
        if (!stapeContainer!.gtmServerWorkspaceId) {
          await prisma.stapeContainer.update({
            where: { id: stapeContainer!.id },
            data: { gtmServerWorkspaceId: serverWorkspaceId },
          });
        }

        // Create server-side trigger (custom event matching the GA4 event name)
        const serverTrigger = await createTrigger(gtm, serverAccountId, serverContainerId, serverWorkspaceId, {
          name: `${tracking.name} - Server Trigger`,
          type: 'CUSTOM_EVENT',
          customEventFilter: [{
            type: 'EQUALS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_') },
            ],
          }],
        });
        sgtmTriggerId = serverTrigger.triggerId || undefined;

        // Create server-side GA4 tag
        if (measurementId) {
          const serverGA4Tag = await createServerGA4Tag(
            gtm, serverAccountId, serverContainerId, serverWorkspaceId,
            {
              name: `${tracking.name} - Server GA4 Tag`,
              measurementId,
              firingTriggerId: [serverTrigger.triggerId!],
            }
          );
          sgtmTagId = serverGA4Tag.tagId || undefined;
        }

        // Create server-side Ads conversion tag if applicable
        if (tracking.adsConversionLabel && (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH'))) {
          const adsAccount = await prisma.googleAdsAccount.findFirst({
            where: { customerId, tenantId },
          });
          if (adsAccount) {
            const serverAdsTag = await createServerAdsConversionTag(
              gtm, serverAccountId, serverContainerId, serverWorkspaceId,
              {
                name: `${tracking.name} - Server Ads Tag`,
                conversionId: adsAccount.accountId,
                conversionLabel: tracking.adsConversionLabel,
                firingTriggerId: [serverTrigger.triggerId!],
              }
            );
            sgtmTagIdAds = serverAdsTag.tagId || undefined;
          }
        }
      }

      // Update tracking with all IDs
      await prisma.tracking.update({
        where: { id: trackingId },
        data: {
          gtmTriggerId: trigger.triggerId,
          gtmTagId: tag.tagId,
          gtmContainerId: containerId,
          gtmWorkspaceId: workspaceId,
          trackingMode: isServerSide ? 'SERVER_SIDE' : 'CLIENT_SIDE',
          sgtmTriggerId: sgtmTriggerId || null,
          sgtmTagId: sgtmTagId || null,
          sgtmTagIdAds: sgtmTagIdAds || null,
          status: 'ACTIVE',
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
    }
```

**Step 2: Update createTagForTracking to accept transport_url**

In the same file, modify `createTagForTracking` (line 249) to add the `transportUrl` parameter:

```typescript
async function createTagForTracking(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tracking: { name: string; ga4EventName?: string | null },
  triggerId: string,
  measurementId?: string,
  transportUrl?: string
) {
  if (!measurementId) {
    throw new Error('GA4 Measurement ID is required to create a tracking tag. Please sync GA4 properties first.');
  }

  const parameters: Array<{ type: string; key: string; value: string }> = [
    {
      type: 'TEMPLATE',
      key: 'eventName',
      value: tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_'),
    },
    {
      type: 'TEMPLATE',
      key: 'measurementIdOverride',
      value: measurementId,
    },
  ];

  // If server-side, route events through Stape instead of directly to Google
  if (transportUrl) {
    parameters.push({
      type: 'TEMPLATE',
      key: 'transportUrl',
      value: transportUrl,
    });
  }

  return createTag(gtm, accountId, containerId, workspaceId, {
    name: `${tracking.name} - Tag`,
    type: 'gaawe',
    parameter: parameters,
    firingTriggerId: [triggerId],
  });
}
```

**Step 3: Commit**

```bash
git add nextjs/src/lib/queue/sync.ts
git commit -m "feat: extend GTM sync to support server-side tracking via Stape"
```

---

## Task 7: Update TypeScript Types

**Files:**
- Modify: `nextjs/src/types/customer.ts`

**Step 1: Add server-side fields to Customer type**

Add after line 27 (`gtmContainerName`):

```typescript
  serverSideEnabled?: boolean;
  stapeContainer?: StapeContainer | null;
```

Add new interface after `GA4Property` (after line 69):

```typescript
export interface StapeContainer {
  id: string;
  customerId: string;
  stapeContainerId: string;
  containerName: string;
  serverDomain: string;
  stapeDefaultDomain: string;
  status: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED';
  domainStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  gtmServerContainerId?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Commit**

```bash
git add nextjs/src/types/customer.ts
git commit -m "feat: add Stape types to customer TypeScript types"
```

---

## Task 8: Update Customer Service to Include Stape Data

**Files:**
- Modify: `nextjs/src/lib/api/customers/service.ts`

**Step 1: Include stapeContainer in customer queries**

Find the `findCustomerById` function and update the Prisma `include` to add `stapeContainer: true` alongside the existing includes (googleAdsAccounts, ga4Properties).

Similarly, update `mapToResponseDto` to pass through the `stapeContainer` and `serverSideEnabled` fields.

**Step 2: Commit**

```bash
git add nextjs/src/lib/api/customers/service.ts
git commit -m "feat: include Stape container in customer queries"
```

---

## Task 9: Update Customer Detail API to Return Stape Data

**Files:**
- Modify: `nextjs/src/app/api/customers/[id]/route.ts`

**Step 1: Include stapeContainer in GET response**

In the GET endpoint, add `stapeContainer: true` to the Prisma include clause where customer data is fetched with relations.

**Step 2: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/route.ts
git commit -m "feat: include Stape container in customer GET response"
```

---

## Task 10: Frontend - Server-Side Tracking Toggle UI

**Files:**
- Modify: `nextjs/src/app/(dashboard)/customers/[id]/page.tsx` (Settings tab, after Google Connection Status card ~line 709)

**Step 1: Add Server-Side Tracking card to Settings tab**

Add a new Card after the Google Connection Status card (after line 709). This card shows:
- Toggle to enable/disable server-side tracking
- Subdomain input field
- CNAME instructions
- Domain validation button and status

```tsx
{/* Server-Side Tracking (Stape) */}
{customer.googleAccountId && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Server-Side Tracking</CardTitle>
          <CardDescription>
            Route tracking through a server for better accuracy and ad-blocker bypass
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {!customer.serverSideEnabled && !customer.stapeContainer ? (
        // Setup form
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverDomain">Custom Tracking Domain</Label>
            <Input
              id="serverDomain"
              value={serverDomain}
              onChange={(e) => setServerDomain(e.target.value)}
              placeholder="track.yoursite.com"
            />
            <p className="text-xs text-muted-foreground">
              Enter a subdomain of your customer&apos;s website (e.g., track.acme.com)
            </p>
          </div>
          <Button
            onClick={handleEnableServerSide}
            disabled={!serverDomain || enableStape.isPending}
          >
            {enableStape.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Server className="mr-2 h-4 w-4" />
            )}
            Enable Server-Side Tracking
          </Button>
        </div>
      ) : customer.stapeContainer ? (
        // Status display
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-lg border p-4 ${
              customer.stapeContainer.status === 'ACTIVE'
                ? 'border-green-200 bg-green-50'
                : customer.stapeContainer.status === 'FAILED'
                  ? 'border-red-200 bg-red-50'
                  : 'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {customer.stapeContainer.status === 'ACTIVE' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : customer.stapeContainer.status === 'FAILED' ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                )}
                <span className="font-medium text-sm">sGTM Container</span>
              </div>
              <p className="text-xs text-muted-foreground">{customer.stapeContainer.containerName}</p>
              <p className="text-xs text-muted-foreground">Status: {customer.stapeContainer.status}</p>
            </div>

            <div className={`rounded-lg border p-4 ${
              customer.stapeContainer.domainStatus === 'VALIDATED'
                ? 'border-green-200 bg-green-50'
                : customer.stapeContainer.domainStatus === 'FAILED'
                  ? 'border-red-200 bg-red-50'
                  : 'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {customer.stapeContainer.domainStatus === 'VALIDATED' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : customer.stapeContainer.domainStatus === 'FAILED' ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                )}
                <span className="font-medium text-sm">Custom Domain</span>
              </div>
              <p className="text-xs text-muted-foreground">{customer.stapeContainer.serverDomain}</p>
              <p className="text-xs text-muted-foreground">Status: {customer.stapeContainer.domainStatus}</p>
            </div>
          </div>

          {customer.stapeContainer.domainStatus === 'PENDING' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-medium mb-2">DNS Setup Required</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Add this CNAME record in your DNS provider:
              </p>
              <div className="bg-white rounded border p-3 font-mono text-sm">
                <p>{customer.stapeContainer.serverDomain} CNAME {customer.stapeContainer.stapeDefaultDomain}</p>
              </div>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={handleValidateDomain}
                disabled={validateDomain.isPending}
              >
                {validateDomain.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify Domain
              </Button>
            </div>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisableServerSide}
            disabled={disableStape.isPending}
          >
            Disable Server-Side Tracking
          </Button>
        </div>
      ) : null}
    </CardContent>
  </Card>
)}
```

**Step 2: Add state and handlers**

Add to the component state section (near line 117):

```typescript
const [serverDomain, setServerDomain] = useState('');
```

Add mutation hooks (near other `useMutation` hooks):

```typescript
const enableStape = useMutation({
  mutationFn: async () => {
    const response = await fetch(`/api/customers/${id}/stape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverDomain }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to enable server-side tracking');
    }
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    toast({ title: 'Server-side tracking enabled', description: 'Follow the DNS setup instructions.' });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

const validateDomain = useMutation({
  mutationFn: async () => {
    const response = await fetch(`/api/customers/${id}/stape/validate-domain`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Domain validation failed');
    }
    return response.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    toast({
      title: data.isValid ? 'Domain verified!' : 'Domain not yet verified',
      description: data.isValid
        ? 'Server-side tracking is now fully active.'
        : 'CNAME record not found. Please check your DNS settings and try again.',
      variant: data.isValid ? 'default' : 'destructive',
    });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

const disableStape = useMutation({
  mutationFn: async () => {
    const response = await fetch(`/api/customers/${id}/stape`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to disable server-side tracking');
    }
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] });
    toast({ title: 'Server-side tracking disabled' });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

const handleEnableServerSide = () => enableStape.mutate();
const handleValidateDomain = () => validateDomain.mutate();
const handleDisableServerSide = () => disableStape.mutate();
```

Add `Server` import at top with other lucide-react imports.

**Step 3: Commit**

```bash
git add nextjs/src/app/\(dashboard\)/customers/\[id\]/page.tsx
git commit -m "feat: add server-side tracking setup UI to customer settings"
```

---

## Task 11: Add Environment Variables

**Files:**
- Modify: `nextjs/.env.example`
- Modify: `nextjs/.env.local` (if exists, add actual values)

**Step 1: Add Stape env vars to .env.example**

Add at the end:

```bash
# Stape Server-Side GTM
STAPE_API_KEY=""
STAPE_API_BASE_URL="https://api.app.stape.io/api/v2"
```

**Step 2: Commit**

```bash
git add nextjs/.env.example
git commit -m "feat: add Stape environment variables to .env.example"
```

---

## Task 12: Integration Testing & Verification

**Step 1: Verify database migration**

Run: `cd /Users/orharazi/OneClickTag/nextjs && npx prisma studio`
Expected: New `StapeContainer` table visible, `Customer` has `serverSideEnabled` field, `Tracking` has `trackingMode`, `sgtmTriggerId`, `sgtmTagId`, `sgtmTagIdAds` fields.

**Step 2: Verify API routes**

Test the Stape API route (requires running dev server):
- `GET /api/customers/{id}/stape` - should return `serverSideEnabled: false, stapeContainer: null`
- `POST /api/customers/{id}/stape` with `{ "serverDomain": "track.test.com" }` - should call Stape API and return container info
- `POST /api/customers/{id}/stape/validate-domain` - should validate domain via Stape
- `DELETE /api/customers/{id}/stape` - should cleanup

**Step 3: Verify UI**

Navigate to a customer with Google connected. In Settings tab, verify:
- Server-Side Tracking card appears below Google Connection Status
- Toggle/form shows to enable server-side tracking
- After enabling, CNAME instructions display
- Verify Domain button works

**Step 4: Verify sync**

Create a new tracking for a server-side enabled customer. Verify:
- Client-side tag created with `transportUrl` pointing to Stape domain
- Server-side trigger and tags created in sGTM container
- Tracking record has `trackingMode: SERVER_SIDE` and `sgtmTriggerId`, `sgtmTagId` populated

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Stape server-side GTM integration"
```

---

## Summary of All Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add StapeContainer model, enums, Customer/Tracking fields |
| `src/lib/stape/types.ts` | Create | Stape API request/response types |
| `src/lib/stape/client.ts` | Create | Stape REST API wrapper |
| `src/lib/google/gtm.ts` | Modify | Add server-side tag creation helpers |
| `src/lib/queue/sync.ts` | Modify | Extend GTM sync for server-side tracking |
| `src/types/customer.ts` | Modify | Add StapeContainer type, serverSideEnabled |
| `src/lib/api/customers/service.ts` | Modify | Include stapeContainer in queries |
| `src/app/api/customers/[id]/route.ts` | Modify | Return stapeContainer in GET |
| `src/app/api/customers/[id]/stape/route.ts` | Create | Stape provisioning API (POST/GET/DELETE) |
| `src/app/api/customers/[id]/stape/validate-domain/route.ts` | Create | Domain validation API |
| `src/app/(dashboard)/customers/[id]/page.tsx` | Modify | Server-side tracking UI |
| `.env.example` | Modify | Add STAPE env vars |
