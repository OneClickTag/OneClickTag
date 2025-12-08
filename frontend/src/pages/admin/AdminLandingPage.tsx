import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, Eye, EyeOff, Layout, Plus, Trash2, Sparkles, Zap, Tag, Target, BarChart3, Shield, Globe } from 'lucide-react';
import { adminLandingService, LandingSection } from '@/lib/api/services/admin';

// Type definitions for each section
interface Badge {
  icon: string;
  text: string;
}

interface CTA {
  text: string;
  url: string;
}

interface DemoStat {
  label: string;
  value: string;
  icon: string;
}

interface HeroContent {
  badge: Badge;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  benefits: string[];
  primaryCTA: CTA;
  secondaryCTA: CTA;
  trustIndicators: string;
  demoVideo: {
    enabled: boolean;
    thumbnail: string | null;
    stats: DemoStat[];
  };
}

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface FeaturesContent {
  title: string;
  titleHighlight: string;
  subtitle: string;
  features: Feature[];
  bottomCTA: {
    text: string;
    linkText: string;
    linkUrl: string;
  };
}

interface CTAContent {
  badge: Badge;
  headline: string;
  headlineSecondLine: string;
  subtitle: string;
  features: string[];
  primaryCTA: CTA;
  secondaryCTA: CTA;
  trustBadge: string;
  testimonial: {
    quote: string;
    author: {
      name: string;
      role: string;
      initials: string;
    };
  };
}

export function AdminLandingPage() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editing state for each section
  const [heroData, setHeroData] = useState<HeroContent | null>(null);
  const [featuresData, setFeaturesData] = useState<FeaturesContent | null>(null);
  const [ctaData, setCtaData] = useState<CTAContent | null>(null);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminLandingService.getAll();

      let sectionsArray: LandingSection[] = [];
      if (Array.isArray(data)) {
        sectionsArray = data;
      } else if (data && typeof data === 'object' && 'data' in data) {
        const wrapped = data as any;
        sectionsArray = Array.isArray(wrapped.data) ? wrapped.data : [];
      }

      setSections(sectionsArray);

      // Parse content into state for each section
      sectionsArray.forEach((section) => {
        if (section.key === 'hero') {
          setHeroData(section.content as HeroContent);
        } else if (section.key === 'features') {
          setFeaturesData(section.content as FeaturesContent);
        } else if (section.key === 'cta') {
          setCtaData(section.content as CTAContent);
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch landing sections:', error);
      setSections([]);
      setMessage({ type: 'error', text: 'Failed to load landing sections' });
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        alert('Access denied. Please logout and login again to refresh your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleSaveSection = async (sectionKey: string) => {
    try {
      setSaving(true);
      setMessage(null);

      const section = sections.find((s) => s.key === sectionKey);
      if (!section) throw new Error('Section not found');

      let content: any;
      if (sectionKey === 'hero') content = heroData;
      else if (sectionKey === 'features') content = featuresData;
      else if (sectionKey === 'cta') content = ctaData;

      await adminLandingService.update(section.id, { content });
      setMessage({ type: 'success', text: `${getSectionLabel(sectionKey)} saved successfully!` });
      fetchSections();
    } catch (error: any) {
      console.error('Failed to save section:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || `Failed to save section`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (section: LandingSection) => {
    try {
      await adminLandingService.toggleActive(section.id, !section.isActive);
      setMessage({
        type: 'success',
        text: `${section.key} section ${!section.isActive ? 'activated' : 'deactivated'}`
      });
      fetchSections();
    } catch (error: any) {
      console.error('Failed to toggle section:', error);
      setMessage({ type: 'error', text: 'Failed to update section status' });
    }
  };

  const getSectionLabel = (key: string): string => {
    const labels: Record<string, string> = {
      hero: 'Hero Section',
      features: 'Features Section',
      cta: 'Call to Action',
      testimonials: 'Testimonials',
      pricing: 'Pricing',
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Hero Section Helpers
  const updateHeroField = (field: keyof HeroContent, value: any) => {
    if (!heroData) return;
    setHeroData({ ...heroData, [field]: value });
  };

  const updateHeroNestedField = (parent: keyof HeroContent, field: string, value: any) => {
    if (!heroData) return;
    setHeroData({
      ...heroData,
      [parent]: { ...(heroData[parent] as any), [field]: value }
    });
  };

  const addHeroBenefit = () => {
    if (!heroData) return;
    setHeroData({ ...heroData, benefits: [...heroData.benefits, ''] });
  };

  const updateHeroBenefit = (index: number, value: string) => {
    if (!heroData) return;
    const newBenefits = [...heroData.benefits];
    newBenefits[index] = value;
    setHeroData({ ...heroData, benefits: newBenefits });
  };

  const removeHeroBenefit = (index: number) => {
    if (!heroData) return;
    setHeroData({ ...heroData, benefits: heroData.benefits.filter((_, i) => i !== index) });
  };

  const addDemoStat = () => {
    if (!heroData) return;
    setHeroData({
      ...heroData,
      demoVideo: {
        ...heroData.demoVideo,
        stats: [...heroData.demoVideo.stats, { label: '', value: '', icon: 'Zap' }]
      }
    });
  };

  const updateDemoStat = (index: number, field: keyof DemoStat, value: string) => {
    if (!heroData) return;
    const newStats = [...heroData.demoVideo.stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setHeroData({
      ...heroData,
      demoVideo: { ...heroData.demoVideo, stats: newStats }
    });
  };

  const removeDemoStat = (index: number) => {
    if (!heroData) return;
    setHeroData({
      ...heroData,
      demoVideo: {
        ...heroData.demoVideo,
        stats: heroData.demoVideo.stats.filter((_, i) => i !== index)
      }
    });
  };

  // Features Section Helpers
  const updateFeaturesField = (field: keyof FeaturesContent, value: any) => {
    if (!featuresData) return;
    setFeaturesData({ ...featuresData, [field]: value });
  };

  const updateBottomCTA = (field: string, value: string) => {
    if (!featuresData) return;
    setFeaturesData({
      ...featuresData,
      bottomCTA: { ...featuresData.bottomCTA, [field]: value }
    });
  };

  const addFeature = () => {
    if (!featuresData) return;
    setFeaturesData({
      ...featuresData,
      features: [...featuresData.features, { icon: 'Tag', title: '', description: '', color: 'from-blue-500 to-blue-600' }]
    });
  };

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    if (!featuresData) return;
    const newFeatures = [...featuresData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFeaturesData({ ...featuresData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    if (!featuresData) return;
    setFeaturesData({
      ...featuresData,
      features: featuresData.features.filter((_, i) => i !== index)
    });
  };

  // CTA Section Helpers
  const updateCTAField = (field: keyof CTAContent, value: any) => {
    if (!ctaData) return;
    setCtaData({ ...ctaData, [field]: value });
  };

  const updateCTANestedField = (parent: keyof CTAContent, field: string, value: any) => {
    if (!ctaData) return;
    setCtaData({
      ...ctaData,
      [parent]: { ...(ctaData[parent] as any), [field]: value }
    });
  };

  const addCTAFeature = () => {
    if (!ctaData) return;
    setCtaData({ ...ctaData, features: [...ctaData.features, ''] });
  };

  const updateCTAFeature = (index: number, value: string) => {
    if (!ctaData) return;
    const newFeatures = [...ctaData.features];
    newFeatures[index] = value;
    setCtaData({ ...ctaData, features: newFeatures });
  };

  const removeCTAFeature = (index: number) => {
    if (!ctaData) return;
    setCtaData({ ...ctaData, features: ctaData.features.filter((_, i) => i !== index) });
  };

  const updateTestimonialAuthor = (field: string, value: string) => {
    if (!ctaData) return;
    setCtaData({
      ...ctaData,
      testimonial: {
        ...ctaData.testimonial,
        author: { ...ctaData.testimonial.author, [field]: value }
      }
    });
  };

  const iconOptions = [
    { value: 'Zap', label: 'Zap (Lightning)', icon: Zap },
    { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
    { value: 'Tag', label: 'Tag', icon: Tag },
    { value: 'Target', label: 'Target', icon: Target },
    { value: 'BarChart3', label: 'Bar Chart', icon: BarChart3 },
    { value: 'Shield', label: 'Shield', icon: Shield },
    { value: 'Globe', label: 'Globe', icon: Globe },
  ];

  const colorOptions = [
    { value: 'from-blue-500 to-blue-600', label: 'Blue' },
    { value: 'from-green-500 to-green-600', label: 'Green' },
    { value: 'from-purple-500 to-purple-600', label: 'Purple' },
    { value: 'from-yellow-500 to-orange-600', label: 'Yellow-Orange' },
    { value: 'from-red-500 to-pink-600', label: 'Red-Pink' },
    { value: 'from-indigo-500 to-indigo-600', label: 'Indigo' },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading landing sections...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Landing Page Sections</h2>
            <p className="text-gray-600 mt-1">Edit hero, features, and CTA sections</p>
          </div>
          <Button variant="outline" onClick={fetchSections} className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* No sections */}
        {sections.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No landing sections found</p>
          </div>
        ) : (
          /* Tabs for sections */
          <Tabs defaultValue={sections[0]?.key || 'hero'} className="w-full">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-white p-0 h-auto">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                >
                  {getSectionLabel(section.key)}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* HERO SECTION */}
            <TabsContent value="hero" className="mt-6">
              {heroData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Section Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Hero Section</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Main landing page header with headline, benefits, and CTAs
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(sections.find(s => s.key === 'hero')!)}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            sections.find(s => s.key === 'hero')?.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {sections.find(s => s.key === 'hero')?.isActive ? (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                        <Button
                          onClick={() => handleSaveSection('hero')}
                          disabled={saving}
                          className="flex items-center space-x-2"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 space-y-6">
                    {/* Badge */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Badge</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                          <select
                            value={heroData.badge.icon}
                            onChange={(e) => updateHeroNestedField('badge', 'icon', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          >
                            {iconOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                          <input
                            type="text"
                            value={heroData.badge.text}
                            onChange={(e) => updateHeroNestedField('badge', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Headline</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Main Headline</label>
                          <input
                            type="text"
                            value={heroData.headline}
                            onChange={(e) => updateHeroField('headline', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                            placeholder="Setup Google Tracking"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Headline Highlight (colored text)</label>
                          <input
                            type="text"
                            value={heroData.headlineHighlight}
                            onChange={(e) => updateHeroField('headlineHighlight', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                            placeholder="In One Click"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                      <textarea
                        value={heroData.subtitle}
                        onChange={(e) => updateHeroField('subtitle', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="Detailed description..."
                      />
                    </div>

                    {/* Benefits */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Benefits</h4>
                        <Button onClick={addHeroBenefit} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Benefit
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {heroData.benefits.map((benefit, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={benefit}
                              onChange={(e) => updateHeroBenefit(index, e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                              placeholder="Benefit text"
                            />
                            <Button
                              onClick={() => removeHeroBenefit(index)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Call to Action Buttons</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Primary CTA Text</label>
                          <input
                            type="text"
                            value={heroData.primaryCTA.text}
                            onChange={(e) => updateHeroNestedField('primaryCTA', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                          <label className="block text-sm font-medium text-gray-700 mt-2">Primary CTA URL</label>
                          <input
                            type="text"
                            value={heroData.primaryCTA.url}
                            onChange={(e) => updateHeroNestedField('primaryCTA', 'url', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Secondary CTA Text</label>
                          <input
                            type="text"
                            value={heroData.secondaryCTA.text}
                            onChange={(e) => updateHeroNestedField('secondaryCTA', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                          <label className="block text-sm font-medium text-gray-700 mt-2">Secondary CTA URL</label>
                          <input
                            type="text"
                            value={heroData.secondaryCTA.url}
                            onChange={(e) => updateHeroNestedField('secondaryCTA', 'url', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Trust Indicators */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trust Indicators</label>
                      <input
                        type="text"
                        value={heroData.trustIndicators}
                        onChange={(e) => updateHeroField('trustIndicators', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="No credit card required • Cancel anytime"
                      />
                    </div>

                    {/* Demo Video */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Demo Video</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={heroData.demoVideo.enabled}
                            onChange={(e) => updateHeroNestedField('demoVideo', 'enabled', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label className="text-sm text-gray-700">Enable demo video section</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL (optional)</label>
                          <input
                            type="text"
                            value={heroData.demoVideo.thumbnail || ''}
                            onChange={(e) => updateHeroNestedField('demoVideo', 'thumbnail', e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Stats</label>
                            <Button onClick={addDemoStat} size="sm" variant="outline">
                              <Plus className="w-4 h-4 mr-1" />
                              Add Stat
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {heroData.demoVideo.stats.map((stat, index) => (
                              <div key={index} className="bg-white p-3 rounded border border-gray-200">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Label</label>
                                    <input
                                      type="text"
                                      value={stat.label}
                                      onChange={(e) => updateDemoStat(index, 'label', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Value</label>
                                    <input
                                      type="text"
                                      value={stat.value}
                                      onChange={(e) => updateDemoStat(index, 'value', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                      <label className="block text-xs text-gray-600 mb-1">Icon</label>
                                      <select
                                        value={stat.icon}
                                        onChange={(e) => updateDemoStat(index, 'icon', e.target.value)}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                      >
                                        {iconOptions.map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <Button
                                      onClick={() => removeDemoStat(index)}
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* FEATURES SECTION */}
            <TabsContent value="features" className="mt-6">
              {featuresData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Section Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Features Section</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Showcase product features with icons and descriptions
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(sections.find(s => s.key === 'features')!)}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            sections.find(s => s.key === 'features')?.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {sections.find(s => s.key === 'features')?.isActive ? (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                        <Button
                          onClick={() => handleSaveSection('features')}
                          disabled={saving}
                          className="flex items-center space-x-2"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 space-y-6">
                    {/* Title */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Section Title</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                          <input
                            type="text"
                            value={featuresData.title}
                            onChange={(e) => updateFeaturesField('title', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Title Highlight</label>
                          <input
                            type="text"
                            value={featuresData.titleHighlight}
                            onChange={(e) => updateFeaturesField('titleHighlight', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                      <textarea
                        value={featuresData.subtitle}
                        onChange={(e) => updateFeaturesField('subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    {/* Features List */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Features</h4>
                        <Button onClick={addFeature} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Feature
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {featuresData.features.map((feature, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-900">Feature #{index + 1}</h5>
                              <Button
                                onClick={() => removeFeature(index)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Icon</label>
                                <select
                                  value={feature.icon}
                                  onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                  {iconOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Color Gradient</label>
                                <select
                                  value={feature.color}
                                  onChange={(e) => updateFeature(index, 'color', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                  {colorOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={feature.title}
                                  onChange={(e) => updateFeature(index, 'title', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Description</label>
                                <textarea
                                  value={feature.description}
                                  onChange={(e) => updateFeature(index, 'description', e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Bottom CTA</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                          <input
                            type="text"
                            value={featuresData.bottomCTA.text}
                            onChange={(e) => updateBottomCTA('text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Link Text</label>
                          <input
                            type="text"
                            value={featuresData.bottomCTA.linkText}
                            onChange={(e) => updateBottomCTA('linkText', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
                          <input
                            type="text"
                            value={featuresData.bottomCTA.linkUrl}
                            onChange={(e) => updateBottomCTA('linkUrl', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* CTA SECTION */}
            <TabsContent value="cta" className="mt-6">
              {ctaData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Section Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Call to Action Section</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Final conversion section with testimonial
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(sections.find(s => s.key === 'cta')!)}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            sections.find(s => s.key === 'cta')?.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {sections.find(s => s.key === 'cta')?.isActive ? (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                        <Button
                          onClick={() => handleSaveSection('cta')}
                          disabled={saving}
                          className="flex items-center space-x-2"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 space-y-6">
                    {/* Badge */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Badge</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                          <select
                            value={ctaData.badge.icon}
                            onChange={(e) => updateCTANestedField('badge', 'icon', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          >
                            {iconOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                          <input
                            type="text"
                            value={ctaData.badge.text}
                            onChange={(e) => updateCTANestedField('badge', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Headline</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Line</label>
                          <input
                            type="text"
                            value={ctaData.headline}
                            onChange={(e) => updateCTAField('headline', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Second Line</label>
                          <input
                            type="text"
                            value={ctaData.headlineSecondLine}
                            onChange={(e) => updateCTAField('headlineSecondLine', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                      <textarea
                        value={ctaData.subtitle}
                        onChange={(e) => updateCTAField('subtitle', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    {/* Features */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Features</h4>
                        <Button onClick={addCTAFeature} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Feature
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {ctaData.features.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updateCTAFeature(index, e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                              placeholder="Feature text"
                            />
                            <Button
                              onClick={() => removeCTAFeature(index)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Call to Action Buttons</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Primary CTA Text</label>
                          <input
                            type="text"
                            value={ctaData.primaryCTA.text}
                            onChange={(e) => updateCTANestedField('primaryCTA', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                          <label className="block text-sm font-medium text-gray-700 mt-2">Primary CTA URL</label>
                          <input
                            type="text"
                            value={ctaData.primaryCTA.url}
                            onChange={(e) => updateCTANestedField('primaryCTA', 'url', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Secondary CTA Text</label>
                          <input
                            type="text"
                            value={ctaData.secondaryCTA.text}
                            onChange={(e) => updateCTANestedField('secondaryCTA', 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                          <label className="block text-sm font-medium text-gray-700 mt-2">Secondary CTA URL</label>
                          <input
                            type="text"
                            value={ctaData.secondaryCTA.url}
                            onChange={(e) => updateCTANestedField('secondaryCTA', 'url', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Trust Badge */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trust Badge</label>
                      <input
                        type="text"
                        value={ctaData.trustBadge}
                        onChange={(e) => updateCTAField('trustBadge', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="🔒 Secure OAuth connection • GDPR compliant"
                      />
                    </div>

                    {/* Testimonial */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Testimonial</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quote</label>
                          <textarea
                            value={ctaData.testimonial.quote}
                            onChange={(e) => updateCTANestedField('testimonial', 'quote', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Author Name</label>
                            <input
                              type="text"
                              value={ctaData.testimonial.author.name}
                              onChange={(e) => updateTestimonialAuthor('name', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <input
                              type="text"
                              value={ctaData.testimonial.author.role}
                              onChange={(e) => updateTestimonialAuthor('role', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Initials</label>
                            <input
                              type="text"
                              value={ctaData.testimonial.author.initials}
                              onChange={(e) => updateTestimonialAuthor('initials', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-md"
                              placeholder="JD"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Each section controls how the landing page displays. Toggle the active status to show or hide sections on the public site. All changes are saved to the database and reflected immediately on the landing page.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
