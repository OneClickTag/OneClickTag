'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MailX, CheckCircle, AlertCircle, ArrowRight, Loader2, Mail } from 'lucide-react';

type UnsubscribeStatus = 'loading' | 'confirm' | 'processing' | 'success' | 'already' | 'error' | 'invalid';

const UNSUBSCRIBE_REASONS = [
  { value: 'too_many_emails', label: 'I receive too many emails' },
  { value: 'not_relevant', label: 'The content is not relevant to me' },
  { value: 'never_signed_up', label: 'I never signed up for this' },
  { value: 'found_alternative', label: 'I found an alternative solution' },
  { value: 'other', label: 'Other reason' },
];

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<UnsubscribeStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [leadEmail, setLeadEmail] = useState<string>('');

  // Check if lead exists and is already unsubscribed
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const checkLead = async () => {
      try {
        const response = await fetch(`/api/public/unsubscribe/check?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          if (data.alreadyUnsubscribed) {
            setStatus('already');
          } else {
            setLeadEmail(data.email || '');
            setStatus('confirm');
          }
        } else {
          if (response.status === 404) {
            setStatus('invalid');
          } else {
            setStatus('error');
            setErrorMessage(data.error || 'Something went wrong');
          }
        }
      } catch {
        setStatus('error');
        setErrorMessage('Failed to connect to the server');
      }
    };

    checkLead();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setStatus('processing');

    const reason = selectedReason === 'other' ? otherReason :
      UNSUBSCRIBE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

    try {
      const response = await fetch('/api/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason: reason || undefined,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Failed to connect to the server');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loading...
            </h1>
            <p className="text-lg text-gray-600">
              Please wait while we load your preferences.
            </p>
          </>
        );

      case 'confirm':
        return (
          <>
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-12 h-12 text-orange-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Unsubscribe from Emails?
            </h1>
            {leadEmail && (
              <p className="text-sm text-gray-500 mb-4">
                Email: <span className="font-medium">{leadEmail}</span>
              </p>
            )}
            <p className="text-lg text-gray-600 mb-8">
              We are sorry to see you go. Before you leave, please let us know why
              you want to unsubscribe so we can improve.
            </p>

            <div className="text-left mb-8">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Why are you unsubscribing? (optional)
              </Label>
              <RadioGroup
                value={selectedReason}
                onValueChange={setSelectedReason}
                className="space-y-3"
              >
                {UNSUBSCRIBE_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label
                      htmlFor={reason.value}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === 'other' && (
                <div className="mt-4">
                  <Textarea
                    placeholder="Please tell us more..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                variant="destructive"
                onClick={handleUnsubscribe}
                className="w-full sm:w-auto"
              >
                Yes, Unsubscribe Me
              </Button>
              <Link href="/">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  No, Keep Me Subscribed
                </Button>
              </Link>
            </div>
          </>
        );

      case 'processing':
        return (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Processing...
            </h1>
            <p className="text-lg text-gray-600">
              Please wait while we process your request.
            </p>
          </>
        );

      case 'success':
        return (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Unsubscribed Successfully
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You have been removed from our mailing list. You will no longer receive
              marketing emails from OneClickTag.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <p className="text-gray-700">
                Changed your mind? You can always re-subscribe by signing up again
                on our website.
              </p>
            </div>
          </>
        );

      case 'already':
        return (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailX className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Already Unsubscribed
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You are already unsubscribed from our mailing list. No further action is needed.
            </p>
          </>
        );

      case 'invalid':
        return (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Invalid Link
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              This unsubscribe link is invalid or has expired. If you believe this is an error,
              please contact us at{' '}
              <a href="mailto:support@oneclicktag.com" className="text-blue-600 hover:underline">
                support@oneclicktag.com
              </a>
            </p>
          </>
        );

      case 'error':
        return (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Something Went Wrong
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              We couldn&apos;t process your unsubscribe request.
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 mb-8">
                Error: {errorMessage}
              </p>
            )}
            <p className="text-gray-600 mb-8">
              Please try again later or contact us at{' '}
              <a href="mailto:support@oneclicktag.com" className="text-blue-600 hover:underline">
                support@oneclicktag.com
              </a>
            </p>
          </>
        );
    }
  };

  return (
    <>
      {renderContent()}

      {/* Return Home Button - only show on certain statuses */}
      {(status === 'success' || status === 'already' || status === 'invalid' || status === 'error') && (
        <Link href="/">
          <Button
            size="lg"
            variant="outline"
            className="mt-6"
          >
            Return to Home
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      )}
    </>
  );
}

function LoadingFallback() {
  return (
    <>
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Loading...
      </h1>
      <p className="text-lg text-gray-600">
        Please wait while we load your preferences.
      </p>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 text-center">
          <Suspense fallback={<LoadingFallback />}>
            <UnsubscribeContent />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          OneClickTag - Simplifying Google tracking setup
        </p>
      </div>
    </div>
  );
}
