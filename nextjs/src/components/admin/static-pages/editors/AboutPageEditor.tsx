'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconPicker } from '@/components/admin/landing/IconPicker';
import { ColorPicker } from '@/components/admin/landing/ColorPicker';
import {
  Plus,
  X,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  Target,
  Heart,
  Users,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Megaphone,
} from 'lucide-react';

// ============ Types ============

interface Stat {
  value: string;
  label: string;
}

interface StoryBlock {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface ValueItem {
  id: string;
  icon: string;
  color: string;
  title: string;
  description: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  linkedin: string;
  twitter: string;
}

interface CTAButton {
  text: string;
  url: string;
}

interface AboutContent {
  hero: {
    badge: { icon: string; text: string };
    headline: string;
    headlineHighlight: string;
    subtitle: string;
    stats: Stat[];
  };
  mission: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    storyBlocks: StoryBlock[];
  };
  values: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    values: ValueItem[];
  };
  team: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    showSection: boolean;
    teamMembers: TeamMember[];
  };
  cta: {
    headline: string;
    subtitle: string;
    primaryCTA: CTAButton;
    secondaryCTA: CTAButton;
  };
}

// ============ Default Content ============

const defaultAboutContent: AboutContent = {
  hero: {
    badge: { icon: 'Sparkles', text: 'About OneClickTag' },
    headline: 'Built by Marketers,',
    headlineHighlight: 'For Marketers',
    subtitle: 'We understand the pain of manual tracking setup. That\'s why we built OneClickTag - to give marketers their time back.',
    stats: [
      { value: '2024', label: 'Founded' },
      { value: '1,000+', label: 'Happy Users' },
      { value: '50K+', label: 'Tags Created' },
    ],
  },
  mission: {
    title: 'Our Story:',
    titleHighlight: 'Why We Exist',
    subtitle: 'The journey from frustration to innovation.',
    storyBlocks: [
      { id: '1', icon: 'Lightbulb', title: 'The Problem', description: 'Marketers waste 30+ hours per month configuring GTM, Google Ads, and GA4 manually.' },
      { id: '2', icon: 'Target', title: 'The Vision', description: 'We envisioned a world where setting up conversion tracking is as simple as a few clicks.' },
      { id: '3', icon: 'Rocket', title: 'The Solution', description: 'OneClickTag was born - an intelligent platform that automates your entire tracking setup.' },
    ],
  },
  values: {
    title: 'Our Values:',
    titleHighlight: 'What Drives Us',
    subtitle: 'The principles that guide everything we do.',
    values: [
      { id: '1', icon: 'Users', color: 'from-blue-500 to-blue-600', title: 'Customer First', description: 'Every decision starts with our users.' },
      { id: '2', icon: 'Zap', color: 'from-purple-500 to-purple-600', title: 'Simplicity', description: 'Complex problems deserve simple solutions.' },
      { id: '3', icon: 'Shield', color: 'from-green-500 to-green-600', title: 'Reliability', description: 'Your tracking data matters.' },
      { id: '4', icon: 'Rocket', color: 'from-orange-500 to-orange-600', title: 'Innovation', description: 'We continuously evolve.' },
    ],
  },
  team: {
    title: 'Meet the',
    titleHighlight: 'Team',
    subtitle: 'The people behind OneClickTag.',
    showSection: false,
    teamMembers: [],
  },
  cta: {
    headline: 'Ready to Get Started?',
    subtitle: 'Join thousands of marketers already saving hours on tracking setup.',
    primaryCTA: { text: 'Start Free Trial', url: '/register' },
    secondaryCTA: { text: 'Contact Us', url: '/contact' },
  },
};

// ============ Props ============

interface AboutPageEditorProps {
  content: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onMetaTitleChange: (metaTitle: string) => void;
  onMetaDescriptionChange: (metaDescription: string) => void;
  onPublishedChange: (isPublished: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  lastUpdated?: string | null;
}

// ============ Helpers ============

function parseAboutContent(content: string): AboutContent {
  if (!content) return defaultAboutContent;
  try {
    const parsed = JSON.parse(content);
    return {
      hero: { ...defaultAboutContent.hero, ...parsed.hero },
      mission: { ...defaultAboutContent.mission, ...parsed.mission },
      values: { ...defaultAboutContent.values, ...parsed.values },
      team: { ...defaultAboutContent.team, ...parsed.team },
      cta: { ...defaultAboutContent.cta, ...parsed.cta },
    };
  } catch {
    return defaultAboutContent;
  }
}

function serializeAboutContent(content: AboutContent): string {
  return JSON.stringify(content, null, 2);
}

// ============ Component ============

export function AboutPageEditor({
  content,
  title,
  metaTitle,
  metaDescription,
  isPublished,
  onContentChange,
  onTitleChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onPublishedChange,
  onSave,
  isSaving,
  hasChanges,
  lastUpdated,
}: AboutPageEditorProps) {
  const [localContent, setLocalContent] = useState<AboutContent>(() => parseAboutContent(content));
  const [activeTab, setActiveTab] = useState('hero');
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!isInternalChange.current) {
      setLocalContent(parseAboutContent(content));
    }
    isInternalChange.current = false;
  }, [content]);

  const updateContent = (updates: Partial<AboutContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    isInternalChange.current = true;
    onContentChange(serializeAboutContent(newContent));
  };

  const handleReset = () => {
    if (!confirm('Reset to default content? This will discard all custom changes.')) return;
    setLocalContent(defaultAboutContent);
    isInternalChange.current = true;
    onContentChange(serializeAboutContent(defaultAboutContent));
  };

  // Hero helpers
  const updateHero = (updates: Partial<AboutContent['hero']>) => {
    updateContent({ hero: { ...localContent.hero, ...updates } });
  };

  const addStat = () => {
    const stats = [...localContent.hero.stats, { value: '0', label: 'New Stat' }];
    updateHero({ stats });
  };

  const updateStat = (index: number, updates: Partial<Stat>) => {
    const stats = [...localContent.hero.stats];
    stats[index] = { ...stats[index], ...updates };
    updateHero({ stats });
  };

  const removeStat = (index: number) => {
    const stats = localContent.hero.stats.filter((_, i) => i !== index);
    updateHero({ stats });
  };

  // Mission helpers
  const updateMission = (updates: Partial<AboutContent['mission']>) => {
    updateContent({ mission: { ...localContent.mission, ...updates } });
  };

  const addStoryBlock = () => {
    const storyBlocks = [...localContent.mission.storyBlocks, {
      id: Date.now().toString(),
      icon: 'Star',
      title: 'New Block',
      description: 'Description here...',
    }];
    updateMission({ storyBlocks });
  };

  const updateStoryBlock = (index: number, updates: Partial<StoryBlock>) => {
    const storyBlocks = [...localContent.mission.storyBlocks];
    storyBlocks[index] = { ...storyBlocks[index], ...updates };
    updateMission({ storyBlocks });
  };

  const removeStoryBlock = (index: number) => {
    const storyBlocks = localContent.mission.storyBlocks.filter((_, i) => i !== index);
    updateMission({ storyBlocks });
  };

  const moveStoryBlock = (index: number, direction: 'up' | 'down') => {
    const storyBlocks = [...localContent.mission.storyBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= storyBlocks.length) return;
    [storyBlocks[index], storyBlocks[newIndex]] = [storyBlocks[newIndex], storyBlocks[index]];
    updateMission({ storyBlocks });
  };

  // Values helpers
  const updateValues = (updates: Partial<AboutContent['values']>) => {
    updateContent({ values: { ...localContent.values, ...updates } });
  };

  const addValue = () => {
    const values = [...localContent.values.values, {
      id: Date.now().toString(),
      icon: 'Star',
      color: 'from-blue-500 to-blue-600',
      title: 'New Value',
      description: 'Description here...',
    }];
    updateValues({ values });
  };

  const updateValue = (index: number, updates: Partial<ValueItem>) => {
    const values = [...localContent.values.values];
    values[index] = { ...values[index], ...updates };
    updateValues({ values });
  };

  const removeValue = (index: number) => {
    const values = localContent.values.values.filter((_, i) => i !== index);
    updateValues({ values });
  };

  const moveValue = (index: number, direction: 'up' | 'down') => {
    const values = [...localContent.values.values];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= values.length) return;
    [values[index], values[newIndex]] = [values[newIndex], values[index]];
    updateValues({ values });
  };

  // Team helpers
  const updateTeam = (updates: Partial<AboutContent['team']>) => {
    updateContent({ team: { ...localContent.team, ...updates } });
  };

  const addTeamMember = () => {
    const teamMembers = [...localContent.team.teamMembers, {
      id: Date.now().toString(),
      name: 'New Member',
      role: 'Role',
      bio: '',
      imageUrl: '',
      linkedin: '',
      twitter: '',
    }];
    updateTeam({ teamMembers });
  };

  const updateTeamMember = (index: number, updates: Partial<TeamMember>) => {
    const teamMembers = [...localContent.team.teamMembers];
    teamMembers[index] = { ...teamMembers[index], ...updates };
    updateTeam({ teamMembers });
  };

  const removeTeamMember = (index: number) => {
    const teamMembers = localContent.team.teamMembers.filter((_, i) => i !== index);
    updateTeam({ teamMembers });
  };

  // CTA helpers
  const updateCTA = (updates: Partial<AboutContent['cta']>) => {
    updateContent({ cta: { ...localContent.cta, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${isPublished ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <Eye className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Published</span>
                <span className="text-green-600">- Visible at /about</span>
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">Draft</span>
                <span className="text-amber-600">- Not visible to visitors</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={onPublishedChange} />
              <Label className="text-sm">{isPublished ? 'Published' : 'Draft'}</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="hero" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Hero
          </TabsTrigger>
          <TabsTrigger value="mission" className="gap-2">
            <Target className="w-4 h-4" />
            Story
          </TabsTrigger>
          <TabsTrigger value="values" className="gap-2">
            <Heart className="w-4 h-4" />
            Values
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="cta" className="gap-2">
            <Megaphone className="w-4 h-4" />
            CTA
          </TabsTrigger>
        </TabsList>

        {/* Hero Tab */}
        <TabsContent value="hero" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Badge</CardTitle>
              <CardDescription>Small badge shown above the headline</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  value={localContent.hero.badge.icon}
                  onChange={(icon) => updateHero({ badge: { ...localContent.hero.badge, icon } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Input
                  value={localContent.hero.badge.text}
                  onChange={(e) => updateHero({ badge: { ...localContent.hero.badge, text: e.target.value } })}
                  placeholder="About OneClickTag"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Headlines</CardTitle>
              <CardDescription>Main headline and subtitle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Main Headline</Label>
                  <Input
                    value={localContent.hero.headline}
                    onChange={(e) => updateHero({ headline: e.target.value })}
                    placeholder="Built by Marketers,"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Text (gradient)</Label>
                  <Input
                    value={localContent.hero.headlineHighlight}
                    onChange={(e) => updateHero({ headlineHighlight: e.target.value })}
                    placeholder="For Marketers"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Textarea
                  value={localContent.hero.subtitle}
                  onChange={(e) => updateHero({ subtitle: e.target.value })}
                  placeholder="We understand the pain..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Stats</CardTitle>
              <CardDescription>Key statistics displayed below the subtitle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {localContent.hero.stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Input
                    value={stat.value}
                    onChange={(e) => updateStat(index, { value: e.target.value })}
                    placeholder="1,000+"
                    className="w-24"
                  />
                  <Input
                    value={stat.label}
                    onChange={(e) => updateStat(index, { label: e.target.value })}
                    placeholder="Happy Users"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeStat(index)} className="hover:bg-red-50">
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addStat} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Stat
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mission/Story Tab */}
        <TabsContent value="mission" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Section Header</CardTitle>
              <CardDescription>Title and subtitle for the story section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={localContent.mission.title}
                    onChange={(e) => updateMission({ title: e.target.value })}
                    placeholder="Our Story:"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Text</Label>
                  <Input
                    value={localContent.mission.titleHighlight}
                    onChange={(e) => updateMission({ titleHighlight: e.target.value })}
                    placeholder="Why We Exist"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={localContent.mission.subtitle}
                  onChange={(e) => updateMission({ subtitle: e.target.value })}
                  placeholder="The journey from frustration to innovation."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Story Blocks</CardTitle>
              <CardDescription>Cards shown in the story section (usually 3)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {localContent.mission.storyBlocks.map((block, index) => (
                <div key={block.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveStoryBlock(index, 'up')} disabled={index === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveStoryBlock(index, 'down')} disabled={index === localContent.mission.storyBlocks.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-medium text-sm flex-1">Block #{index + 1}: {block.title}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeStoryBlock(index)} className="hover:bg-red-50">
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <IconPicker value={block.icon} onChange={(icon) => updateStoryBlock(index, { icon })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={block.title} onChange={(e) => updateStoryBlock(index, { title: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={block.description} onChange={(e) => updateStoryBlock(index, { description: e.target.value })} rows={2} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addStoryBlock} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Story Block
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Values Tab */}
        <TabsContent value="values" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Section Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={localContent.values.title} onChange={(e) => updateValues({ title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Highlighted Text</Label>
                  <Input value={localContent.values.titleHighlight} onChange={(e) => updateValues({ titleHighlight: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input value={localContent.values.subtitle} onChange={(e) => updateValues({ subtitle: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Values</CardTitle>
              <CardDescription>Core company values displayed in cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {localContent.values.values.map((value, index) => (
                <div key={value.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveValue(index, 'up')} disabled={index === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveValue(index, 'down')} disabled={index === localContent.values.values.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-medium text-sm flex-1">{value.title}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeValue(index)} className="hover:bg-red-50">
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <IconPicker value={value.icon} onChange={(icon) => updateValue(index, { icon })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <ColorPicker value={value.color} onChange={(color) => updateValue(index, { color })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={value.title} onChange={(e) => updateValue(index, { title: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={value.description} onChange={(e) => updateValue(index, { description: e.target.value })} rows={2} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addValue} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Value
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Team Section</CardTitle>
                  <CardDescription>Showcase your team members</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={localContent.team.showSection} onCheckedChange={(showSection) => updateTeam({ showSection })} />
                  <Label className="text-sm">{localContent.team.showSection ? 'Visible' : 'Hidden'}</Label>
                </div>
              </div>
            </CardHeader>
            {localContent.team.showSection && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={localContent.team.title} onChange={(e) => updateTeam({ title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Highlighted Text</Label>
                    <Input value={localContent.team.titleHighlight} onChange={(e) => updateTeam({ titleHighlight: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={localContent.team.subtitle} onChange={(e) => updateTeam({ subtitle: e.target.value })} />
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="mb-3 block font-medium">Team Members</Label>
                  {localContent.team.teamMembers.map((member, index) => (
                    <div key={member.id} className="border rounded-lg p-4 mb-3 space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">Member #{index + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeTeamMember(index)} className="hover:bg-red-50">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Name" value={member.name} onChange={(e) => updateTeamMember(index, { name: e.target.value })} />
                        <Input placeholder="Role" value={member.role} onChange={(e) => updateTeamMember(index, { role: e.target.value })} />
                      </div>
                      <Input placeholder="Image URL (optional)" value={member.imageUrl} onChange={(e) => updateTeamMember(index, { imageUrl: e.target.value })} />
                      <Textarea placeholder="Bio (optional)" value={member.bio} onChange={(e) => updateTeamMember(index, { bio: e.target.value })} rows={2} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="LinkedIn URL" value={member.linkedin} onChange={(e) => updateTeamMember(index, { linkedin: e.target.value })} />
                        <Input placeholder="Twitter URL" value={member.twitter} onChange={(e) => updateTeamMember(index, { twitter: e.target.value })} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addTeamMember} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* CTA Tab */}
        <TabsContent value="cta" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Call to Action Section</CardTitle>
              <CardDescription>The final section encouraging action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={localContent.cta.headline} onChange={(e) => updateCTA({ headline: e.target.value })} placeholder="Ready to Get Started?" />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Textarea value={localContent.cta.subtitle} onChange={(e) => updateCTA({ subtitle: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  <Label className="font-medium">Primary Button</Label>
                  <Input value={localContent.cta.primaryCTA.text} onChange={(e) => updateCTA({ primaryCTA: { ...localContent.cta.primaryCTA, text: e.target.value } })} placeholder="Start Free Trial" />
                  <Input value={localContent.cta.primaryCTA.url} onChange={(e) => updateCTA({ primaryCTA: { ...localContent.cta.primaryCTA, url: e.target.value } })} placeholder="/register" />
                </div>
                <div className="space-y-3">
                  <Label className="font-medium">Secondary Button</Label>
                  <Input value={localContent.cta.secondaryCTA.text} onChange={(e) => updateCTA({ secondaryCTA: { ...localContent.cta.secondaryCTA, text: e.target.value } })} placeholder="Contact Us" />
                  <Input value={localContent.cta.secondaryCTA.url} onChange={(e) => updateCTA({ secondaryCTA: { ...localContent.cta.secondaryCTA, url: e.target.value } })} placeholder="/contact" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SEO Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">SEO Settings</CardTitle>
          <CardDescription>Search engine optimization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Page Title (Browser Tab)</Label>
            <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="About Us" />
          </div>
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={metaTitle} onChange={(e) => onMetaTitleChange(e.target.value)} placeholder="About Us | OneClickTag" />
            <p className="text-xs text-gray-500">{metaTitle.length}/60 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea value={metaDescription} onChange={(e) => onMetaDescriptionChange(e.target.value)} rows={2} placeholder="Learn about OneClickTag..." />
            <p className="text-xs text-gray-500">{metaDescription.length}/160 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-between items-center sticky bottom-0 bg-white py-4 border-t -mx-6 px-6 -mb-6">
        <div className="text-sm text-gray-500">
          {lastUpdated && <>Last updated: {new Date(lastUpdated).toLocaleString()}</>}
        </div>
        <Button onClick={onSave} disabled={!hasChanges || isSaving} size="lg">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
