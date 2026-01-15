-- Insert How It Works section
INSERT INTO "landing_page_content" ("id", "key", "content", "is_active", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'how-it-works',
  '{
    "title": "How It Works",
    "subtitle": "Get up and running in minutes, not hours. Our streamlined process makes tracking setup effortless.",
    "steps": [
      {
        "icon": "MousePointerClick",
        "title": "Connect Google Account",
        "description": "One-click OAuth connection. We securely access your GTM, Google Ads, and GA4 with your permission.",
        "step": "01"
      },
      {
        "icon": "Link2",
        "title": "Configure Tracking",
        "description": "Select what you want to track (button clicks, form submits, page views). Just enter the CSS selector.",
        "step": "02"
      },
      {
        "icon": "Rocket",
        "title": "Deploy Instantly",
        "description": "We automatically create tags, triggers, conversions, and events. Everything is synced in seconds.",
        "step": "03"
      },
      {
        "icon": "CheckCircle2",
        "title": "Monitor & Optimize",
        "description": "See all your trackings in one dashboard. Update or delete anytime. Track status in real-time.",
        "step": "04"
      }
    ],
    "stats": [
      { "value": "2 min", "label": "Average Setup Time" },
      { "value": "95%", "label": "Time Saved" },
      { "value": "100%", "label": "Accuracy" },
      { "value": "0", "label": "Code Required" }
    ]
  }'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (key) DO NOTHING;

-- Insert Social Proof section
INSERT INTO "landing_page_content" ("id", "key", "content", "is_active", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'social-proof',
  '{
    "stats": [
      {
        "icon": "Users",
        "value": "1,000+",
        "label": "Active Users",
        "description": "Marketers trust OneClickTag"
      },
      {
        "icon": "Target",
        "value": "50,000+",
        "label": "Trackings Created",
        "description": "Automated conversions deployed"
      },
      {
        "icon": "Clock",
        "value": "10,000+",
        "label": "Hours Saved",
        "description": "Time freed for strategy"
      },
      {
        "icon": "TrendingUp",
        "value": "99.9%",
        "label": "Uptime",
        "description": "Reliable performance"
      }
    ],
    "trustTitle": "Powered By Industry Leaders",
    "logos": [
      { "name": "Google", "width": "w-24" },
      { "name": "Analytics", "width": "w-28" },
      { "name": "Ads", "width": "w-20" },
      { "name": "Tag Manager", "width": "w-32" },
      { "name": "Firebase", "width": "w-24" }
    ],
    "testimonials": [
      {
        "quote": "OneClickTag cut our tracking setup time from hours to minutes. It''s a game-changer for our agency.",
        "author": "Sarah Johnson",
        "role": "Marketing Director",
        "company": "Digital Growth Co."
      },
      {
        "quote": "The automation is incredible. We can now focus on strategy instead of tedious tag management.",
        "author": "Michael Chen",
        "role": "Performance Marketer",
        "company": "AdScale Agency"
      },
      {
        "quote": "Finally, a tool that makes Google tracking accessible. Our entire team can use it without training.",
        "author": "Emily Rodriguez",
        "role": "Growth Lead",
        "company": "StartupBoost"
      }
    ]
  }'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (key) DO NOTHING;
