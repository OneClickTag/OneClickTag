# CORS Configuration

## Environment Variable

The backend uses the `CORS_ORIGIN` environment variable to configure allowed origins for Cross-Origin Resource Sharing (CORS).

## Configuration

### Single Origin

```bash
CORS_ORIGIN="http://localhost:5173"
```

### Multiple Origins

To allow multiple origins, separate them with commas:

```bash
CORS_ORIGIN="http://localhost:5173,https://app.example.com,https://staging.example.com"
```

## How It Works

The backend will automatically:
1. Read the `CORS_ORIGIN` environment variable
2. Split it by commas if multiple origins are provided
3. Trim whitespace from each origin
4. Configure the NestJS application to allow requests from those origins
5. Log the enabled origins during startup: `🌐 CORS enabled for origins: [...]`

## Configuration Files

- **Development**: `backend/.env` - Set `CORS_ORIGIN="http://localhost:5173"`
- **Staging**: `backend/api.stage.env` - Set `CORS_ORIGIN="https://stage.oneclicktag.com"`
- **Production**: `backend/api.prod.env` - Set `CORS_ORIGIN="https://oneclicktag.com"`

## Default Value

If `CORS_ORIGIN` is not set, the backend defaults to:
```
http://localhost:5173
```

## Additional CORS Settings

The backend also configures:
- `credentials: true` - Allows cookies and authentication headers
- `methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']` - Allowed HTTP methods
- `allowedHeaders: ['Content-Type', 'Authorization', 'Accept']` - Allowed request headers

## Testing CORS

To verify CORS is working:

1. Start the backend with your desired `CORS_ORIGIN`:
   ```bash
   CORS_ORIGIN="http://localhost:5173" npm run start:dev
   ```

2. Check the console output for:
   ```
   🌐 CORS enabled for origins: [ 'http://localhost:5173' ]
   ```

3. Make a request from the allowed origin and check the response headers:
   ```bash
   curl -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:3001/api/health
   ```

   You should see:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Credentials: true
   ```

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Cause**: The frontend origin is not in the `CORS_ORIGIN` list.

**Solution**: Add the frontend URL to `CORS_ORIGIN`:
```bash
# If frontend is at http://localhost:3000
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
```

### CORS Error: "Credentials flag is true but Access-Control-Allow-Credentials is not"

**Cause**: The backend credentials setting might be misconfigured.

**Solution**: This is already set to `true` in `main.ts`. No action needed.

### Multiple Origins Not Working

**Cause**: Origins might not be comma-separated or have extra whitespace.

**Solution**: Ensure proper formatting:
```bash
# ✅ Correct
CORS_ORIGIN="http://localhost:5173,https://app.example.com"

# ❌ Wrong - missing commas
CORS_ORIGIN="http://localhost:5173 https://app.example.com"

# ✅ Correct - whitespace is automatically trimmed
CORS_ORIGIN="http://localhost:5173, https://app.example.com, https://staging.example.com"
```

## Implementation Details

Located in `backend/src/main.ts`:

```typescript
// CORS Configuration with support for multiple origins
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

console.log('🌐 CORS enabled for origins:', allowedOrigins);

app.enableCors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```
