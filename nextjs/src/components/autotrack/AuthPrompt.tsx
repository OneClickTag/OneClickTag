'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Lock, X, CheckCircle, AlertCircle, UserPlus, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type SelectedOption = 'credentials' | 'auto-register' | 'skip' | null;

interface AuthPromptProps {
  loginUrl: string | null;
  domain: string;
  // Option 1: User provides credentials
  onSaveCredential: (username: string, password: string, saveForFuture?: boolean, mfaCode?: string) => void;
  isSavingCredential: boolean;
  // Option 2: Auto-register
  onAutoRegister: () => void;
  isAutoRegistering: boolean;
  autoRegisterStatus: 'idle' | 'finding_signup' | 'creating_account' | 'success' | 'failed';
  autoRegisterError?: string | null;
  // Option 3: Skip
  onSkip: () => void;
}

export function AuthPrompt({
  loginUrl,
  domain,
  onSaveCredential,
  isSavingCredential,
  onAutoRegister,
  isAutoRegistering,
  autoRegisterStatus,
  autoRegisterError,
  onSkip,
}: AuthPromptProps) {
  const [selectedOption, setSelectedOption] = useState<SelectedOption>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'submitting' | 'success' | 'failed' | 'mfa-required'>('idle');

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      setLoginStatus('submitting');
      onSaveCredential(username, password, saveForFuture, mfaCode || undefined);
    }
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode) {
      setLoginStatus('submitting');
      onSaveCredential(username, password, saveForFuture, mfaCode);
    }
  };

  const handleRetry = () => {
    setLoginStatus('idle');
    setPassword('');
    setMfaCode('');
  };

  const handleAutoRegister = () => {
    setSelectedOption('auto-register');
    onAutoRegister();
  };

  const handleSkip = () => {
    setSelectedOption('skip');
    onSkip();
  };

  const handleClose = () => {
    onSkip();
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
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            A login page was found{loginUrl ? ` at ${loginUrl}` : ''}. Choose how to proceed:
          </p>

          {/* Three Option Cards */}
          {!selectedOption && (
            <div className="mt-4 space-y-2">
              {/* Option 1: I have credentials */}
              <button
                onClick={() => setSelectedOption('credentials')}
                className="w-full flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-50 rounded">
                  <Lock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">I have credentials</div>
                  <div className="text-xs text-gray-600">Provide username and password to access protected pages</div>
                </div>
              </button>

              {/* Option 2: Auto-create test account */}
              <button
                onClick={handleAutoRegister}
                className="w-full flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-left"
              >
                <div className="p-2 bg-green-50 rounded">
                  <UserPlus className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Auto-create test account</div>
                  <div className="text-xs text-gray-600">Let AI find signup page and create a test account automatically</div>
                </div>
              </button>

              {/* Option 3: Skip protected pages */}
              <button
                onClick={handleSkip}
                className="w-full flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded">
                  <SkipForward className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Skip protected pages</div>
                  <div className="text-xs text-gray-600">Continue scan without accessing pages that require login</div>
                </div>
              </button>
            </div>
          )}

          {/* Option 1 Expanded: Credentials Form */}
          {selectedOption === 'credentials' && (
            <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-blue-600" />
                <h5 className="font-medium text-sm text-gray-900">Provide Credentials</h5>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-auto"
                  onClick={() => setSelectedOption(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <form onSubmit={handleCredentialSubmit} className="space-y-3">
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
                      disabled={!mfaCode || isSavingCredential}
                    >
                      {isSavingCredential ? (
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
                    onClick={() => setSelectedOption(null)}
                    disabled={loginStatus === 'submitting' || loginStatus === 'success'}
                  >
                    Back
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5" /> Encrypted storage
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* Option 2 Expanded: Auto-register Progress */}
          {selectedOption === 'auto-register' && (
            <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-green-600" />
                <h5 className="font-medium text-sm text-gray-900">Auto-Creating Test Account</h5>
              </div>

              <div className="space-y-3">
                {/* Finding signup page */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  {autoRegisterStatus === 'finding_signup' ? (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : autoRegisterStatus === 'creating_account' || autoRegisterStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : autoRegisterStatus === 'failed' ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className={`text-sm ${
                    autoRegisterStatus === 'finding_signup' ? 'text-blue-600 font-medium' :
                    autoRegisterStatus === 'creating_account' || autoRegisterStatus === 'success' ? 'text-gray-600' :
                    autoRegisterStatus === 'failed' ? 'text-red-600' :
                    'text-gray-400'
                  }`}>
                    Finding signup page...
                  </span>
                </div>

                {/* Creating account */}
                {(autoRegisterStatus === 'creating_account' || autoRegisterStatus === 'success' || autoRegisterStatus === 'failed') && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    {autoRegisterStatus === 'creating_account' ? (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : autoRegisterStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : autoRegisterStatus === 'failed' ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className={`text-sm ${
                      autoRegisterStatus === 'creating_account' ? 'text-blue-600 font-medium' :
                      autoRegisterStatus === 'success' ? 'text-gray-600' :
                      autoRegisterStatus === 'failed' ? 'text-red-600' :
                      'text-gray-400'
                    }`}>
                      Creating account...
                    </span>
                  </div>
                )}

                {/* Success message */}
                {autoRegisterStatus === 'success' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Success! Continuing with test account</span>
                  </div>
                )}

                {/* Failure message */}
                {autoRegisterStatus === 'failed' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Failed to create test account</span>
                    </div>
                    {autoRegisterError && (
                      <p className="text-xs text-red-600 mb-2">{autoRegisterError}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOption(null)}
                      className="h-7 text-xs"
                    >
                      Try another option
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Option 3 Expanded: Skip Confirmation */}
          {selectedOption === 'skip' && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="h-4 w-4 text-gray-600" />
                <h5 className="font-medium text-sm text-gray-900">Skipping Protected Pages</h5>
              </div>
              <p className="text-sm text-gray-600">
                Scan will continue analyzing public pages only. Protected pages will be marked as skipped.
              </p>
            </div>
          )}

          {/* Non-blocking message */}
          <div className="mt-3 text-[10px] text-amber-700 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Scan continues analyzing public pages while waiting for your decision</span>
          </div>
        </div>
      </div>
    </div>
  );
}
