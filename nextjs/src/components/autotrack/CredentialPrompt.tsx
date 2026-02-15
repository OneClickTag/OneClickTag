'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Lock, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type LoginStatus = 'idle' | 'submitting' | 'success' | 'failed' | 'mfa-required';

interface CredentialPromptProps {
  loginUrl: string | null;
  domain: string;
  onSave: (username: string, password: string, saveForFuture?: boolean, mfaCode?: string) => void;
  onSkip: () => void;
  isSaving: boolean;
}

export function CredentialPrompt({ loginUrl, domain, onSave, onSkip, isSaving }: CredentialPromptProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setLoginStatus('submitting');
      onSave(username, password, saveForFuture, mfaCode || undefined);
    }
  };

  const handleRetry = () => {
    setLoginStatus('idle');
    setPassword('');
    setMfaCode('');
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode) {
      setLoginStatus('submitting');
      onSave(username, password, saveForFuture, mfaCode);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-amber-100 rounded">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-amber-900">Login Page Detected</h4>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onSkip}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            A login page was found{loginUrl ? ` at ${loginUrl}` : ''}. Provide credentials for deeper analysis of protected pages.
          </p>

          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="cred-user" className="text-xs">Username / Email</Label>
                <Input
                  id="cred-user"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="user@example.com"
                  className="h-8 text-sm"
                  disabled={loginStatus === 'submitting' || loginStatus === 'success'}
                />
              </div>
              <div>
                <Label htmlFor="cred-pass" className="text-xs">Password</Label>
                <Input
                  id="cred-pass"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-8 text-sm"
                  disabled={loginStatus === 'submitting' || loginStatus === 'success'}
                />
              </div>
            </div>

            {/* Save for future checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-future"
                checked={saveForFuture}
                onCheckedChange={(checked) => setSaveForFuture(checked === true)}
                disabled={loginStatus === 'submitting' || loginStatus === 'success'}
              />
              <Label
                htmlFor="save-future"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Save credentials for future scans
              </Label>
            </div>

            {/* Login status feedback */}
            {loginStatus === 'success' && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Login successful! Continuing scan...</span>
              </div>
            )}

            {loginStatus === 'failed' && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-red-700">Login failed. Please check your credentials.</span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleRetry} className="h-7 text-xs">
                  Retry
                </Button>
              </div>
            )}

            {/* MFA code input */}
            {loginStatus === 'mfa-required' && (
              <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">Two-Factor Authentication Required</span>
                </div>
                <div>
                  <Label htmlFor="mfa-code" className="text-xs">Enter MFA Code</Label>
                  <Input
                    id="mfa-code"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value)}
                    placeholder="123456"
                    className="h-8 text-sm"
                    maxLength={6}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMfaSubmit}
                  disabled={!mfaCode || loginStatus === 'submitting'}
                >
                  {loginStatus === 'submitting' ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Submit Code
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!username || !password || loginStatus === 'submitting' || loginStatus === 'success'}
              >
                {loginStatus === 'submitting' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : loginStatus === 'success' ? (
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                )}
                {loginStatus === 'submitting' ? 'Logging in...' : loginStatus === 'success' ? 'Success' : 'Save & Continue'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={loginStatus === 'submitting' || loginStatus === 'success'}
              >
                Skip
              </Button>
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Encrypted storage
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
