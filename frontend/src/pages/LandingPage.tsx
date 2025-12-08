import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingSocialProof } from '@/components/landing/LandingSocialProof';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { Footer } from '@/components/layout/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingSocialProof />
      <LandingCTA />
      <Footer />
    </div>
  );
}
