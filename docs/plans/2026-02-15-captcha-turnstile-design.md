# Cloudflare Turnstile CAPTCHA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add invisible CAPTCHA protection (Cloudflare Turnstile) to login, registration, and early-access forms.

**Architecture:** Turnstile widget generates a token invisibly on each form. The token is passed to backend API routes alongside existing form data. Server-side verification calls Cloudflare's siteverify endpoint before any business logic executes.

**Tech Stack:** Cloudflare Turnstile, `@marsidev/react-turnstile`, Next.js API routes, React

---

### Task 1: Install Turnstile package

**Files:**
- Modify: `nextjs/package.json`

**Step 1: Install the React Turnstile wrapper**

```bash
cd /Users/orharazi/OneClickTag/nextjs && npm install @marsidev/react-turnstile
```

**Step 2: Verify installation**

```bash
cd /Users/orharazi/OneClickTag/nextjs && node -e "require('@marsidev/react-turnstile')" 2>&1 || echo "ESM only, that's fine"
```

Expected: Package installed in node_modules.

**Step 3: Add environment variables**

Add to `nextjs/.env.local` (or wherever env vars are stored):

```
# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Note: These are Cloudflare's official test keys. Replace with real keys for production.
- Test site key `1x00000000000000000000AA` always passes
- Test secret key `1x0000000000000000000000000000000AA` always passes

**Step 4: Commit**

```bash
git add nextjs/package.json nextjs/package-lock.json
git commit -m "chore: install @marsidev/react-turnstile for CAPTCHA"
```

---

### Task 2: Create server-side Turnstile verification utility

**Files:**
- Create: `nextjs/src/lib/auth/turnstile.ts`

**Step 1: Create the verification utility**

```typescript
// nextjs/src/lib/auth/turnstile.ts

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if verification passes, false otherwise.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not set, skipping verification');
    return true; // Allow in development when key not configured
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result: TurnstileVerifyResponse = await response.json();

    if (!result.success) {
      console.warn('[Turnstile] Verification failed:', result['error-codes']);
    }

    return result.success;
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return false;
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/auth/turnstile.ts
git commit -m "feat: add server-side Turnstile verification utility"
```

---

### Task 3: Add Turnstile verification to login API route

**Files:**
- Modify: `nextjs/src/app/api/auth/login/route.ts`

**Step 1: Add Turnstile verification to the login handler**

At the top of the file, add the import:

```typescript
import { verifyTurnstile } from '@/lib/auth/turnstile';
```

Update the `LoginRequestBody` interface to include the turnstile token:

```typescript
interface LoginRequestBody {
  idToken: string;
  tenantId?: string;
  turnstileToken?: string;
}
```

Add verification right after the `idToken` check (after line 83, before the Firebase token verification):

```typescript
    // Verify Turnstile CAPTCHA
    if (body.turnstileToken) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const isHuman = await verifyTurnstile(body.turnstileToken, ip || undefined);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }
```

**Step 2: Commit**

```bash
git add nextjs/src/app/api/auth/login/route.ts
git commit -m "feat: add Turnstile verification to login API route"
```

---

### Task 4: Add Turnstile verification to register API route

**Files:**
- Modify: `nextjs/src/app/api/auth/register/route.ts`

**Step 1: Add Turnstile verification to the register handler**

At the top of the file, add the import:

```typescript
import { verifyTurnstile } from '@/lib/auth/turnstile';
```

Update the `RegisterRequestBody` interface:

```typescript
interface RegisterRequestBody {
  idToken: string;
  name?: string;
  tenantName?: string;
  turnstileToken?: string;
}
```

Add verification right after the `idToken` check (after line 84, before Firebase token verification):

```typescript
    // Verify Turnstile CAPTCHA
    if (body.turnstileToken) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const isHuman = await verifyTurnstile(body.turnstileToken, ip || undefined);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }
```

**Step 2: Commit**

```bash
git add nextjs/src/app/api/auth/register/route.ts
git commit -m "feat: add Turnstile verification to register API route"
```

---

### Task 5: Add Turnstile verification to leads API route

**Files:**
- Modify: `nextjs/src/app/api/public/leads/route.ts`

**Step 1: Add Turnstile verification to the leads handler**

At the top of the file, add the import:

```typescript
import { verifyTurnstile } from '@/lib/auth/turnstile';
```

Add `turnstileToken` to the Zod schema:

```typescript
const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  purpose: z.string().min(1, 'Purpose is required').max(1000, 'Purpose must be 1000 characters or less'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
  marketingConsent: z.boolean().optional().default(false),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  turnstileToken: z.string().optional(),
});
```

Add verification after Zod validation passes (after line 44, before the duplicate email check):

```typescript
    // Verify Turnstile CAPTCHA
    if (data.turnstileToken) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const isHuman = await verifyTurnstile(data.turnstileToken, ip || undefined);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }
```

**Step 2: Commit**

```bash
git add nextjs/src/app/api/public/leads/route.ts
git commit -m "feat: add Turnstile verification to leads API route"
```

---

### Task 6: Update auth-provider to accept and forward Turnstile tokens

**Files:**
- Modify: `nextjs/src/components/providers/auth-provider.tsx`

**Step 1: Update the login function signature and body**

Change the `login` function to accept an optional `turnstileToken` parameter:

```typescript
  const login = async (email: string, password: string, turnstileToken?: string) => {
    const { loginWithEmail } = await import('@/lib/auth/firebase-client');
    const userCredential = await loginWithEmail(email, password);
    const idToken = await userCredential.user.getIdToken();

    // Authenticate with backend
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate with backend');
    }

    const data = await response.json();
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setUser(data.user);
  };
```

**Step 2: Update the loginWithGoogle function**

```typescript
  const loginWithGoogle = async (turnstileToken?: string) => {
    const { loginWithGoogle: firebaseLoginWithGoogle } = await import('@/lib/auth/firebase-client');
    const userCredential = await firebaseLoginWithGoogle();
    const idToken = await userCredential.user.getIdToken();

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate with backend');
    }

    const data = await response.json();
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setUser(data.user);
  };
```

**Step 3: Update the register function**

```typescript
  const register = async (email: string, password: string, name: string, turnstileToken?: string) => {
    const { registerWithEmail } = await import('@/lib/auth/firebase-client');
    const userCredential = await registerWithEmail(email, password, name);
    const idToken = await userCredential.user.getIdToken();

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, name, email, turnstileToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register with backend');
    }

    const data = await response.json();
    document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}`;
    setUser(data.user);
  };
```

**Step 4: Update the AuthContextType interface**

```typescript
interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  loginWithGoogle: (turnstileToken?: string) => Promise<void>;
  register: (email: string, password: string, name: string, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}
```

**Step 5: Commit**

```bash
git add nextjs/src/components/providers/auth-provider.tsx
git commit -m "feat: update auth-provider to forward Turnstile tokens to API"
```

---

### Task 7: Add Turnstile to Login page

**Files:**
- Modify: `nextjs/src/app/login/page.tsx`

**Step 1: Add Turnstile import and state**

Add at the top with other imports:

```typescript
import { Turnstile } from '@marsidev/react-turnstile';
```

Add state inside `LoginForm`:

```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
```

**Step 2: Update handleSubmit to pass token**

```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setLoginAttempted(true);

    try {
      await login(email, password, turnstileToken || undefined);
    } catch (err: any) {
      console.error('[Login] Sign in failed:', err);
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
      setIsSubmitting(false);
      setLoginAttempted(false);
    }
  };
```

**Step 3: Update handleGoogleSignIn to pass token**

```typescript
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    setLoginAttempted(true);

    try {
      await loginWithGoogle(turnstileToken || undefined);
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      setError(err?.message || 'Failed to sign in with Google.');
      setIsSubmitting(false);
      setLoginAttempted(false);
    }
  };
```

**Step 4: Add Turnstile widget to JSX**

Add right before the closing `</div>` of `w-full max-w-md space-y-8` (before the closing of the form container), after the "Don't have an account?" paragraph:

```tsx
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
            options={{
              size: 'invisible',
            }}
          />
        )}
```

**Step 5: Commit**

```bash
git add nextjs/src/app/login/page.tsx
git commit -m "feat: add Turnstile CAPTCHA to login page"
```

---

### Task 8: Add Turnstile to Register page

**Files:**
- Modify: `nextjs/src/app/register/page.tsx`

**Step 1: Add Turnstile import and state**

Add at the top with other imports:

```typescript
import { Turnstile } from '@marsidev/react-turnstile';
```

Add state inside `RegisterPage`:

```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
```

**Step 2: Update handleSubmit to pass token**

```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await register(email, password, name, turnstileToken || undefined);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err?.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };
```

**Step 3: Update handleGoogleSignUp to pass token**

```typescript
  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await loginWithGoogle(turnstileToken || undefined);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google sign up failed:', err);
      setError(err?.message || 'Failed to sign up with Google.');
      setIsSubmitting(false);
    }
  };
```

**Step 4: Add Turnstile widget to JSX**

Add after the "Already have an account?" paragraph, before the closing `</div>`:

```tsx
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
            options={{
              size: 'invisible',
            }}
          />
        )}
```

**Step 5: Commit**

```bash
git add nextjs/src/app/register/page.tsx
git commit -m "feat: add Turnstile CAPTCHA to register page"
```

---

### Task 9: Add Turnstile to Early Access page

**Files:**
- Modify: `nextjs/src/app/early-access/page.tsx`

**Step 1: Add Turnstile import and state**

Add at the top with other imports:

```typescript
import { Turnstile } from '@marsidev/react-turnstile';
```

Add state inside `EarlyAccessContent`:

```typescript
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
```

**Step 2: Update handleSubmit to include token in the fetch body**

In the `JSON.stringify` call inside `handleSubmit`, add `turnstileToken`:

```typescript
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          purpose: formData.purpose,
          acceptedTerms: formData.acceptedTerms,
          marketingConsent: formData.marketingConsent,
          source: 'early-access',
          utmSource,
          utmMedium,
          utmCampaign,
          userAgent: navigator.userAgent,
          turnstileToken,
        }),
```

**Step 3: Add Turnstile widget to JSX**

Add inside the form, right before the submit button:

```tsx
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{
                  size: 'invisible',
                }}
              />
            )}
```

**Step 4: Commit**

```bash
git add nextjs/src/app/early-access/page.tsx
git commit -m "feat: add Turnstile CAPTCHA to early access page"
```

---

### Task 10: Manual testing

**Step 1: Verify dev server is running**

The dev servers should already be running. Check the login page at `http://localhost:3001/login`.

**Step 2: Test login flow**

1. Go to `/login`
2. Enter credentials and submit
3. Should work normally (invisible CAPTCHA, test keys always pass)
4. Check browser console for any Turnstile errors

**Step 3: Test register flow**

1. Go to `/register`
2. Fill in fields and submit
3. Should work normally

**Step 4: Test early access flow**

1. Go to `/early-access`
2. Fill in fields and submit
3. Should work normally

**Step 5: Verify server-side logs**

Check terminal for any `[Turnstile]` log messages. With test keys, all should pass.

**Step 6: Final commit**

If any fixes were needed during testing, commit them.
