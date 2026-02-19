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
    return true;
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
