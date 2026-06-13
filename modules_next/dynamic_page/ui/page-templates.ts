import type { BlockData } from '@/modules/dynamic_page/dynamic_page.types'

export interface PageTemplate {
  id: string
  name: string
  description: string
  sections: BlockData[]
}

// Generate stable block IDs for templates — non-crypto, deterministic
function bid(suffix: string) {
  return `tpl-${suffix}`
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from an empty page.',
    sections: [],
  },

  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero → Features → Stats → Testimonials → CTA',
    sections: [
      {
        id: bid('land-hero'),
        type: 'HeroBlock',
        order: 0,
        props: {
          variant: 'centered',
          title: 'Your Product Headline',
          titleAccent: 'That Converts',
          subtitle: 'A compelling one-liner that explains your value proposition in plain language.',
          cta: { label: 'Get Started', href: '/signup', target: '_self' },
          ctaSecondary: { label: 'Learn More', href: '#features', target: '_self' },
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'hero',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('land-feat'),
        type: 'FeatureGridBlock',
        order: 1,
        props: {
          heading: 'Everything You Need',
          subheading: 'Built to scale with your business from day one.',
          columns: '3',
          style: 'card',
          features: [
            { icon: 'rocket',    title: 'Fast Setup',           description: 'Get started in minutes.' },
            { icon: 'shield',    title: 'Secure by Default',     description: 'Enterprise-grade security built in.' },
            { icon: 'bolt',      title: 'High Performance',      description: 'Optimised for speed at any scale.' },
            { icon: 'globe',     title: 'Global CDN',            description: 'Content delivered fast worldwide.' },
            { icon: 'users',     title: 'Team Collaboration',    description: 'Role-based access for your team.' },
            { icon: 'chart-bar', title: 'Analytics',             description: 'Deep insights into your usage.' },
          ],
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'features',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('land-stats'),
        type: 'StatsBlock',
        order: 2,
        props: {
          heading: '',
          subheading: '',
          columns: '4',
          style: 'simple',
          stats: [
            { prefix: '',  value: '10K+', suffix: '',   label: 'Active Users' },
            { prefix: '$', value: '2M',   suffix: '+',  label: 'Revenue Processed' },
            { prefix: '',  value: '99.9', suffix: '%',  label: 'Uptime SLA' },
            { prefix: '',  value: '4.9',  suffix: '/5', label: 'Customer Rating' },
          ],
          blockClass: 'bg-[var(--surface-raised)]',
          sectionId: 'stats',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('land-test'),
        type: 'TestimonialsBlock',
        order: 3,
        props: {
          heading: 'Loved by Teams Worldwide',
          subheading: "Don't just take our word for it.",
          columns: '3',
          showRating: true,
          testimonials: [
            { quote: 'This platform changed how our team collaborates.', name: 'Sarah Mitchell', role: 'Head of Product', company: 'TechCorp', avatar: '', rating: 5 },
            { quote: "The best investment we've made this year.", name: 'James Okafor', role: 'Engineering Lead', company: 'BuildFast', avatar: '', rating: 5 },
            { quote: 'Outstanding support and a product that actually delivers.', name: 'Priya Sharma', role: 'Founder', company: 'Launchpad', avatar: '', rating: 5 },
          ],
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'testimonials',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('land-cta'),
        type: 'CTABlock',
        order: 4,
        props: {
          heading: 'Ready to Get Started?',
          subheading: 'Join thousands of teams already using our platform.',
          layout: 'centered',
          cta: { label: 'Start for Free', href: '/signup', target: '_self' },
          ctaSecondary: { label: 'Talk to Sales', href: '/contact', target: '_self' },
          blockClass: 'bg-[var(--primary)] text-white',
          sectionId: 'cta',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
    ],
  },

  {
    id: 'about',
    name: 'About Page',
    description: 'Hero → Story (Prose) → Stats → CTA',
    sections: [
      {
        id: bid('about-hero'),
        type: 'HeroBlock',
        order: 0,
        props: {
          variant: 'left',
          title: 'About',
          titleAccent: 'Our Company',
          subtitle: 'We are on a mission to make great software accessible to everyone.',
          cta: { label: 'Meet the Team', href: '#team', target: '_self' },
          ctaSecondary: { label: '', href: '', target: '_self' },
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'about-hero',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('about-prose'),
        type: 'ProseBlock',
        order: 1,
        props: {
          title: 'Our Story',
          subtitle: '',
          content: '<p>We started with a simple problem: great tools should not be limited to big companies. Since then, we have helped thousands of teams build better products, faster.</p><h2>Our Values</h2><ul><li><strong>Customer first</strong> — everything we build starts with a real customer need.</li><li><strong>Transparency</strong> — we communicate openly, internally and externally.</li><li><strong>Quality</strong> — we ship things we are proud of.</li></ul>',
          blockClass: 'bg-[var(--surface-base)] pt-0',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('about-stats'),
        type: 'StatsBlock',
        order: 2,
        props: {
          heading: 'By the Numbers',
          subheading: '',
          columns: '4',
          style: 'card',
          stats: [
            { prefix: '',  value: '2019',   suffix: '', label: 'Founded' },
            { prefix: '',  value: '50+',    suffix: '', label: 'Team Members' },
            { prefix: '',  value: '120+',   suffix: '', label: 'Countries Served' },
            { prefix: '$', value: '10M+',   suffix: '', label: 'Revenue' },
          ],
          blockClass: 'bg-[var(--surface-raised)]',
          sectionId: 'numbers',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('about-cta'),
        type: 'CTABlock',
        order: 3,
        props: {
          heading: 'Want to Join Us?',
          subheading: "We're always looking for talented people.",
          layout: 'side-by-side',
          cta: { label: 'View Open Roles', href: '/careers', target: '_self' },
          ctaSecondary: { label: 'Contact Us', href: '/contact', target: '_self' },
          blockClass: 'bg-[var(--surface-overlay)]',
          sectionId: '',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
    ],
  },

  {
    id: 'faq-page',
    name: 'FAQ Page',
    description: 'Hero → FAQ Accordion → CTA',
    sections: [
      {
        id: bid('faq-hero'),
        type: 'HeroBlock',
        order: 0,
        props: {
          variant: 'centered',
          title: 'Frequently Asked',
          titleAccent: 'Questions',
          subtitle: "Can't find the answer? Contact our support team.",
          cta: { label: 'Contact Support', href: '/contact', target: '_self' },
          ctaSecondary: { label: '', href: '', target: '_self' },
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'faq-hero',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('faq-main'),
        type: 'FaqAccordionBlock',
        order: 1,
        props: {
          heading: '',
          subheading: '',
          layout: 'two-col',
          faqs: [
            { question: 'How do I get started?',           answer: "Sign up for a free account and follow our quick-start guide. You'll be up and running in under 10 minutes." },
            { question: 'Do you offer a free trial?',      answer: 'Yes — all plans come with a 14-day free trial, no credit card required.' },
            { question: 'Can I change my plan later?',     answer: 'Absolutely. Upgrade, downgrade, or cancel at any time from your account settings.' },
            { question: 'Is my data secure?',              answer: 'We take security seriously. Your data is encrypted at rest and in transit.' },
            { question: 'Do you offer customer support?',  answer: 'Yes. Email support on all plans, live chat on Pro and Enterprise.' },
            { question: 'What integrations do you offer?', answer: 'We integrate with Slack, Zapier, GitHub, and many more via our API.' },
          ],
          blockClass: 'bg-[var(--surface-base)]',
          sectionId: 'faq',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
      {
        id: bid('faq-cta'),
        type: 'CTABlock',
        order: 2,
        props: {
          heading: 'Still Have Questions?',
          subheading: "Our team is happy to help. Reach out any time.",
          layout: 'centered',
          cta: { label: 'Contact Us', href: '/contact', target: '_self' },
          ctaSecondary: { label: '', href: '', target: '_self' },
          blockClass: 'bg-[var(--primary)] text-white',
          sectionId: '',
          paddingY: 'none', paddingX: 'container', maxWidth: 'content',
        },
      },
    ],
  },
]
