'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/providers/auth-provider';
import { Logo } from '@/components/Logo';
import { Chrome, Loader2, Info } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const router = useRouter();
  const { user, register, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (user && !isSubmitting) {
      router.push('/dashboard');
    }
  }, [user, isSubmitting, router]);

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
          <h1 className="text-2xl font-bold mt-6">Create Account</h1>
          <p className="text-muted-foreground mt-2">
            {EARLY_ACCESS_MODE ? 'Create your account for early access' : 'Get started today'}
          </p>
        </div>

        {EARLY_ACCESS_MODE && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Early Access Mode</p>
              <p className="mt-1">
                Dashboard access is currently limited. Create an account to be notified when we launch.
                Want to join the waitlist instead?{' '}
                <Link href="/early-access" className="underline font-medium">
                  Click here
                </Link>
              </p>
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={handleInputChange(setName)}
              required
              disabled={isSubmitting}
              className="mt-2"
              placeholder="Your name"
            />
          </div>

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
              minLength={6}
              className="mt-2"
              placeholder="At least 6 characters"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
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
          onClick={handleGoogleSignUp}
          disabled={isSubmitting}
        >
          <Chrome className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Creating Account...' : 'Google'}
        </Button>

        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
            options={{ size: 'invisible' }}
          />
        )}
      </div>
    </div>
  );
}
