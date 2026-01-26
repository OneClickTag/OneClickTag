import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Twitter, Linkedin, Facebook } from 'lucide-react';

export function ThankYouPage() {
  const expectedLaunchDate = import.meta.env.VITE_EXPECTED_LAUNCH_DATE || 'Q1 2025';

  const shareText = "I just joined the early access waitlist for OneClickTag - automated conversion tracking made simple! 🚀";
  const shareUrl = window.location.origin;

  // LinkedIn post URL from environment - opens post for reposting
  const linkedInPostUrl = import.meta.env.VITE_LINKEDIN_SHARE_POST_URL || '';

  const handleShare = (platform: string) => {
    if (platform === 'linkedin') {
      // Open LinkedIn post for reposting
      if (linkedInPostUrl) {
        window.open(linkedInPostUrl, '_blank', 'width=800,height=700');
      } else {
        console.error('LinkedIn post URL not configured');
        alert('LinkedIn sharing is not configured. Please contact support.');
      }
      return;
    }

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };

    window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center"
        >
          {/* Success Icon with Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            You're on the List! 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl text-gray-600 mb-8"
          >
            Thank you for joining our early access program! We're excited to have you on board.
          </motion.p>

          {/* What's Next Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-blue-50 rounded-xl p-6 mb-8 text-left"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Check Your Email</h3>
                  <p className="text-gray-600">We've sent you a confirmation email with all the details.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">We're Building</h3>
                  <p className="text-gray-600">Our team is working hard to finalize OneClickTag for launch.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Early Access</h3>
                  <p className="text-gray-600">
                    You'll be among the first to get access when we launch in <strong>{expectedLaunchDate}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Exclusive Benefits</h3>
                  <p className="text-gray-600">As an early adopter, you'll get special pricing and features.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="border-t border-gray-200 pt-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Help us spread the word
            </h3>

            {/* Featured LinkedIn Repost Button */}
            <div className="mb-4">
              <Button
                size="lg"
                onClick={() => handleShare('linkedin')}
                className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
              >
                <Linkedin className="w-6 h-6 mr-3" />
                Repost on LinkedIn
              </Button>
              <p className="text-sm text-gray-600 mt-3 text-center">
                Click to open our post, then hit the Repost button to share with your network
              </p>
            </div>

            {/* Other Share Options */}
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare('twitter')}
                className="hover:bg-blue-50"
              >
                <Twitter className="w-5 h-5 mr-2" />
                Tweet
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare('facebook')}
                className="hover:bg-blue-50"
              >
                <Facebook className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-8"
          >
            <Link to="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
