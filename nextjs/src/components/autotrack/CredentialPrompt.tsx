'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CredentialPromptProps {
  loginUrl: string | null;
  domain: string;
  onSave: (username: string, password: string) => void;
  onSkip: () => void;
  isSaving: boolean;
}

export function CredentialPrompt({ loginUrl, domain, onSave, onSkip, isSaving }: CredentialPromptProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onSave(username, password);
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

          <form onSubmit={handleSubmit} className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="cred-user" className="text-xs">Username / Email</Label>
                <Input
                  id="cred-user"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="user@example.com"
                  className="h-8 text-sm"
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
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={!username || !password || isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save & Continue
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
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
