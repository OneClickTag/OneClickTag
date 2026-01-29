'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { Logo } from '@/components/Logo';
import { Chrome, Loader2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login, loginWithGoogle } = useAuth();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Redirect when user is authenticated after login attempt
  useEffect(() => {
    if (loginAttempted && user && !loading) {
      router.push(redirectUrl);
    }
  }, [user, loading, loginAttempted, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setLoginAttempted(true);

    try {
      await login(email, password);
      // Redirect handled by useEffect when user state updates
    } catch (err: any) {
      console.error('[Login] Sign in failed:', err);
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
      setIsSubmitting(false);
      setLoginAttempted(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    setLoginAttempted(true);

    try {
      await loginWithGoogle();
      // Redirect handled by useEffect when user state updates
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      setError(err?.message || 'Failed to sign in with Google.');
      setIsSubmitting(false);
      setLoginAttempted(false);
    }
  };

  const handleInputChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (error) setError(null);
      setter(e.target.value);
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo width={200} height={38} />
          </Link>
          <h1 className="text-2xl font-bold mt-6">Sign In</h1>
          <p className="text-muted-foreground mt-2">Welcome back</p>
        </div>

        {user && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-md">
            <p className="font-medium mb-2">You&apos;re already signed in</p>
            <p className="mb-3">
              You can continue to your dashboard or sign in as a different user.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(redirectUrl)}
                className="flex-1"
              >
                Continue to App
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              required
              disabled={isSubmitting}
              className="mt-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={handleInputChange(setPassword)}
              required
              disabled={isSubmitting}
              className="mt-2"
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Signing In...' : 'Google'}
        </Button>

        <p className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
