# Tracking Creation System - Implementation Plan

## Overview
Multi-step tracking creation system that orchestrates Google Tag Manager, GA4, and Google Ads conversion tracking.

## Architecture

### 1. **Tracking Types** (38 types based on Campaigner Agent)

**Basic Interactions**: BUTTON_CLICK, LINK_CLICK, PAGE_VIEW, ELEMENT_VISIBILITY

**Forms**: FORM_SUBMIT, FORM_START, FORM_ABANDON

**E-commerce**: ADD_TO_CART, REMOVE_FROM_CART, ADD_TO_WISHLIST, VIEW_CART, CHECKOUT_START, CHECKOUT_STEP, PURCHASE, PRODUCT_VIEW

**Lead Generation**: PHONE_CALL_CLICK, EMAIL_CLICK, DOWNLOAD, DEMO_REQUEST, SIGNUP

**Engagement**: SCROLL_DEPTH, TIME_ON_PAGE, VIDEO_PLAY, VIDEO_COMPLETE

**Navigation & Search**: SITE_SEARCH, FILTER_USE, TAB_SWITCH, ACCORDION_EXPAND, MODAL_OPEN

**Social**: SOCIAL_SHARE, SOCIAL_CLICK

**Content**: PDF_DOWNLOAD, FILE_DOWNLOAD, NEWSLETTER_SIGNUP

**Custom**: CUSTOM_EVENT

### 2. **Database Schema** ✅ COMPLETED

- Expanded `TrackingType` enum with 38 types
- Added `TrackingDestination` enum (GA4, GOOGLE_ADS, BOTH)
- Added `config` JSON field for type-specific configuration
- Added `destinations` array for multi-destination support
- Added crawler preparation fields: `isAutoCrawled`, `crawlMetadata`, `selectorConfidence`
- Added `trackingSettings` to Customer model for default preferences

### 3. **DTOs** ✅ COMPLETED

Created comprehensive DTOs in `/dto/tracking.dto.ts`:
- `CreateTrackingDto` - Main creation DTO
- Type-specific config DTOs: `ScrollDepthConfigDto`, `TimeOnPageConfigDto`, `VideoTrackingConfigDto`, `EcommerceConfigDto`, `FormTrackingConfigDto`
- `TRACKING_TYPE_METADATA` - Frontend metadata with required fields, icons, GA4 event names

### 4. **Service Layer** (Next Steps)

#### TrackingService
**Responsibilities**:
- Orchestrate GTM + GA4 + Google Ads creation
- Handle type-specific logic
- Manage tracking lifecycle
- Queue background jobs for GTM sync

**Methods**:
```typescript
async createTracking(customerId: string, dto: CreateTrackingDto): Promise<Tracking>
async updateTracking(trackingId: string, dto: UpdateTrackingDto): Promise<Tracking>
async deleteTracking(trackingId: string): Promise<void>
async getCustomerTrackings(customerId: string, filters: FilterDto): Promise<TrackingResponse>
async syncTracking(trackingId: string): Promise<void>
async pauseTracking(trackingId: string): Promise<void>
async activateTracking(trackingId: string): Promise<void>
```

#### GTMTrackingService
**Responsibilities**:
- Create GTM triggers based on tracking type
- Create GTM tags (GA4 and/or Google Ads)
- Handle GTM workspace operations
- Map tracking types to GTM trigger types

**GTM Trigger Type Mapping**:
```typescript
{
  BUTTON_CLICK: 'CLICK',
  PAGE_VIEW: 'PAGEVIEW',
  FORM_SUBMIT: 'FORM_SUBMISSION',
  SCROLL_DEPTH: 'SCROLL_DEPTH',
  TIME_ON_PAGE: 'TIMER',
  VIDEO_PLAY: 'YOUTUBE_VIDEO',
  // ... etc
}
```

#### GA4TrackingService
**Responsibilities**:
- Create GA4 event tags in GTM
- Map tracking types to GA4 recommended events
- Handle GA4 event parameters

**GA4 Event Name Mapping** (from Campaigner Agent):
```typescript
{
  ADD_TO_CART: 'add_to_cart',
  PURCHASE: 'purchase',
  BEGIN_CHECKOUT: 'begin_checkout',
  SIGNUP: 'sign_up',
  PHONE_CALL_CLICK: 'generate_lead',
  // ... etc
}
```

#### GoogleAdsTrackingService
**Responsibilities**:
- Create Google Ads conversion actions
- Create Google Ads conversion tags in GTM
- Link conversion actions to GTM tags

### 5. **Background Jobs**

Use BullMQ for async GTM operations:

**Queues**:
- `tracking-creation` - Create tracking in GTM/GA4/Ads
- `tracking-sync` - Sync tracking updates
- `tracking-deletion` - Delete tracking from GTM/GA4/Ads

**Job Flow**:
```
User creates tracking
→ Save to database (status: PENDING)
→ Queue background job
→ Job creates GTM trigger
→ Job creates GTM tag(s) based on destinations
→ Job creates Google Ads conversion action (if needed)
→ Update database (status: ACTIVE or FAILED)
→ Emit SSE event to frontend
```

### 6. **API Endpoints**

```
POST   /v1/customers/:customerId/trackings
GET    /v1/customers/:customerId/trackings
GET    /v1/customers/:customerId/trackings/:trackingId
PATCH  /v1/customers/:customerId/trackings/:trackingId
DELETE /v1/customers/:customerId/trackings/:trackingId
POST   /v1/customers/:customerId/trackings/:trackingId/sync
POST   /v1/customers/:customerId/trackings/:trackingId/pause
POST   /v1/customers/:customerId/trackings/:trackingId/activate
POST   /v1/customers/:customerId/trackings/bulk-delete
GET    /v1/customers/:customerId/tracking-types
```

### 7. **Frontend Components**

#### CreateTrackingForm
Dynamic form that adapts based on tracking type:

**Common Fields**:
- Name (required)
- Type (dropdown with categories)
- Description (optional)
- Destinations (checkboxes: GA4, Google Ads)

**Type-Specific Fields** (shown conditionally):
- For BUTTON_CLICK, LINK_CLICK: Selector input
- For PAGE_VIEW: URL pattern input
- For SCROLL_DEPTH: Percentage slider (25%, 50%, 75%, 100%)
- For TIME_ON_PAGE: Time input (seconds)
- For PURCHASE, ADD_TO_CART: Value input, currency
- For FORM_SUBMIT: Form selector, track fields checkbox
- For VIDEO_PLAY: Video selector, milestones

**Smart Features**:
- Show/hide fields based on tracking type
- Pre-fill GA4 event name (with override option)
- Show required field indicators
- Selector validation
- Live preview of GTM configuration

### 8. **Customer Settings Tab**

Add tracking defaults section:

**Settings**:
- Default destinations (GA4, Google Ads, or both)
- Default GA4 property (dropdown of connected properties)
- Default Google Ads account (dropdown of connected accounts)
- Auto-publish GTM changes (yes/no)

### 9. **Crawler Integration (Future)**

Prepared schema fields for future crawler:
- `isAutoCrawled`: Boolean flag
- `crawlMetadata`: JSON with detection context
- `selectorConfig`: Array of selectors with confidence scores
- `selectorConfidence`: Float 0-1

**Crawler Flow** (Future):
```
User provides URL
→ Crawler analyzes page
→ Identifies trackable elements using Campaigner Agent patterns
→ Generates selectors using Crawler Agent patterns
→ Suggests tracking configurations
→ User approves/modifies
→ Creates trackings automatically
```

### 10. **Validation Rules**

**By Tracking Type**:
- BUTTON_CLICK, LINK_CLICK → Requires `selector`
- PAGE_VIEW → Requires `urlPattern`
- SCROLL_DEPTH → Requires `config.scrollPercentage` (1-100)
- TIME_ON_PAGE → Requires `config.timeSeconds` (>0)
- PURCHASE → Requires `selector` or `urlPattern`, supports `config.trackValue`
- CUSTOM_EVENT → Requires `selector` and `ga4EventName`

**Destination Validation**:
- If GOOGLE_ADS selected → Must have Google Ads account connected
- If GA4 selected → Must have GA4 property connected

### 11. **Error Handling**

**GTM Errors**:
- Workspace conflicts → Retry with fresh workspace
- Invalid selector → Return clear error message
- Rate limit → Exponential backoff

**Google Ads Errors**:
- Conversion action exists → Link to existing
- Invalid conversion category → Provide suggestions

**GA4 Errors**:
- Invalid event name → Suggest valid name
- Missing measurement ID → Prompt to connect property

### 12. **Real-time Updates**

Use SSE to stream tracking creation progress:

**Events**:
```
tracking.creating        - { trackingId, status: 'creating' }
tracking.gtm.trigger     - { trackingId, status: 'trigger_created', triggerId }
tracking.gtm.tag         - { trackingId, status: 'tag_created', tagId }
tracking.ads.conversion  - { trackingId, status: 'conversion_created', conversionId }
tracking.completed       - { trackingId, status: 'active' }
tracking.failed          - { trackingId, status: 'failed', error }
```

### 13. **Testing Strategy**

**Unit Tests**:
- DTOs validation
- Tracking type to GTM trigger mapping
- GA4 event name mapping
- Configuration validation

**Integration Tests**:
- Full tracking creation flow
- GTM workspace management
- Multi-destination tracking
- Error handling

**E2E Tests**:
- Create tracking via UI
- Verify GTM trigger created
- Verify GA4 tag created
- Verify Google Ads conversion created
- Test real-time updates

## Implementation Phases

### Phase 1: Core Service ✅ Planning
- [x] Database schema
- [x] DTOs
- [ ] TrackingService basic CRUD
- [ ] TrackingController endpoints
- [ ] TrackingModule setup

### Phase 2: GTM Integration
- [ ] GTMTrackingService
- [ ] Trigger type mapping
- [ ] Tag creation logic
- [ ] Workspace management

### Phase 3: GA4 Integration
- [ ] GA4TrackingService
- [ ] Event name mapping
- [ ] Parameter handling
- [ ] Measurement ID selection

### Phase 4: Google Ads Integration
- [ ] GoogleAdsTrackingService
- [ ] Conversion action creation
- [ ] Conversion tag creation
- [ ] Value tracking

### Phase 5: Background Jobs
- [ ] BullMQ queue setup
- [ ] Job processors
- [ ] Error handling
- [ ] Retry logic

### Phase 6: Frontend
- [ ] Dynamic tracking form
- [ ] Type selection with categories
- [ ] Conditional field rendering
- [ ] Validation
- [ ] Real-time status updates

### Phase 7: Customer Settings
- [ ] Default destinations
- [ ] GA4 property selection
- [ ] Ads account selection
- [ ] Save/update settings

### Phase 8: Testing & Polish
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Error messages
- [ ] Documentation

## Next Steps

1. Create migration for schema changes
2. Implement TrackingService (basic CRUD)
3. Implement TrackingController
4. Set up TrackingModule
5. Implement GTMTrackingService
6. Create background job processors
7. Build frontend tracking form

Would you like me to proceed with Phase 1 implementation?
