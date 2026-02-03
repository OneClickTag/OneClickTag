'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl text-center">
        {/* 404 Number with Gradient */}
        <div className="relative mb-8">
          <h1 className="text-[180px] md:text-[220px] font-black leading-none bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent select-none">
            404
          </h1>
          {/* Decorative elements behind the number */}
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-48 h-48 border-4 border-dashed border-blue-200 rounded-full animate-spin-slow" style={{ animationDuration: '20s' }} />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-blue-600" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Oops! The page you are looking for seems to have wandered off.
            It might have been moved, deleted, or never existed in the first place.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Home className="w-5 h-5 mr-2" />
                Go to Homepage
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => typeof window !== 'undefined' && window.history.back()}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 mb-4">Or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/early-access"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center"
              >
                Join Waitlist
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/about"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center"
              >
                About Us
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/contact"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">
            Need help? Email us at{' '}
            <a
              href="mailto:support@oneclicktag.com"
              className="text-blue-600 hover:underline"
            >
              support@oneclicktag.com
            </a>
          </span>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          OneClickTag - Simplifying Google tracking setup
        </p>
      </div>

      {/* Custom animation style */}
      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
