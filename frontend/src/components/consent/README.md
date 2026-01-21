# Cookie Consent Components

Public-facing cookie consent banner components for end-user websites.

## Components

### 1. `useCookieConsent` Hook
React hook for managing cookie consent state and interactions.

### 2. `CookieConsentBanner`
Main banner component that displays on first visit.

### 3. `CookiePreferencesModal`
Detailed preferences dialog for granular cookie control.

## Usage Example

```tsx
import { CookieConsentBanner, CookiePreferencesModal } from '@/components/consent';

function App() {
  const tenantId = 'your-tenant-id'; // From your configuration

  return (
    <div>
      {/* Your app content */}

      {/* Add these at the end of your app */}
      <CookieConsentBanner tenantId={tenantId} />
      <CookiePreferencesModal tenantId={tenantId} />
    </div>
  );
}
```

## Standalone Usage (For Customer Websites)

To use these components on customer websites, you can:

1. **Direct Import** (if using React):
```html
<script src="https://your-cdn.com/oneclicktag-consent.js"></script>
<script>
  window.OneClickTagConsent.init({
    tenantId: 'customer-tenant-id'
  });
</script>
```

2. **React Component**:
```tsx
import { CookieConsentBanner, CookiePreferencesModal } from '@oneclicktag/consent';

function CustomerApp() {
  return (
    <>
      <CookieConsentBanner tenantId="abc123" />
      <CookiePreferencesModal tenantId="abc123" />
    </>
  );
}
```

## Features

### Data Storage
- **LocalStorage Key**: `oneclicktag_consent_${tenantId}`
- **Anonymous ID Key**: `oneclicktag_anonymous_id`
- **Expiry**: Automatically handled based on banner config

### Cookie Categories
1. **Necessary Cookies** (Always enabled)
   - Essential for website functionality
   - Cannot be disabled

2. **Analytics Cookies** (Optional)
   - Website usage and interaction tracking
   - Can be toggled by user

3. **Marketing Cookies** (Optional)
   - Cross-site tracking and advertising
   - Can be toggled by user

### API Integration

#### Get Banner Configuration
```
GET /api/public/consent/banner?tenantId=XXX
```

Response:
```json
{
  "headingText": "We value your privacy",
  "bodyText": "We use cookies to enhance your browsing experience...",
  "acceptButtonText": "Accept All",
  "rejectButtonText": "Reject All",
  "customizeButtonText": "Customize",
  "primaryColor": "#4F46E5",
  "secondaryColor": "#FFFFFF",
  "textColor": "#1F2937",
  "position": "bottom",
  "consentExpiryDays": 365
}
```

#### Record Consent
```
POST /api/public/consent/record
```

Request Body:
```json
{
  "tenantId": "abc123",
  "anonymousId": "550e8400-e29b-41d4-a716-446655440000",
  "necessaryCookies": true,
  "analyticsCookies": true,
  "marketingCookies": false,
  "consentGivenAt": "2024-01-21T00:00:00.000Z"
}
```

#### Get User Consent
```
GET /api/public/consent/user-consent?tenantId=XXX&anonymousId=YYY
```

## Customization

### Banner Position
- `bottom`: Fixed at bottom of viewport (default)
- `top`: Fixed at top of viewport
- `center`: Modal overlay in center

### Styling
All colors and text are configurable through the banner config API:
- `primaryColor`: Accept button background
- `secondaryColor`: Banner background
- `textColor`: All text color

### Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management in modal

## Testing

### Check LocalStorage
```javascript
// Open browser console
localStorage.getItem('oneclicktag_consent_abc123');
localStorage.getItem('oneclicktag_anonymous_id');
```

### Reset Consent (for testing)
```javascript
localStorage.removeItem('oneclicktag_consent_abc123');
// Reload page to see banner again
```

### Test Different Positions
Modify the banner config to test different positions:
```json
{
  "position": "bottom" // or "top" or "center"
}
```

## Security Considerations

1. **No Authentication Required**: Public endpoints for banner config and consent recording
2. **Anonymous Tracking**: Uses UUID v4 for anonymous user identification
3. **GDPR Compliant**: Users can opt-out of non-essential cookies
4. **LocalStorage Only**: No server-side sessions required
5. **HTTPS Recommended**: Ensure secure transmission of consent data

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for fetch and localStorage)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Multi-language support
- [ ] Cookie policy link in banner
- [ ] Export consent preferences
- [ ] Consent history tracking
- [ ] Analytics dashboard for consent rates
