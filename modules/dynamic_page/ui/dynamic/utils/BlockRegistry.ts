import type { BlockDefinition } from '../types'
import { ProseBlockDefinition } from '../Blocks/prose-block.component'
import { CustomBlockDefinition } from '../Blocks/custom-block.component'
import { HeroBlockDefinition } from '../Blocks/hero-block.component'
import { PopupModalBlockDefinition } from '../Blocks/PopupModalBlock'
import { NavBarSimpleDefinition } from '../Blocks/nav-bar-simple.component'
import { NavBarMarketingDefinition } from '../Blocks/nav-bar-marketing.component'
import { NavBarCommerceDefinition } from '../Blocks/nav-bar-commerce.component'
import { FooterMinimalDefinition } from '../Blocks/footer-minimal.component'
import { FooterColumnsDefinition } from '../Blocks/footer-columns.component'
import { FooterCommerceDefinition } from '../Blocks/footer-commerce.component'
import { FeatureGridBlockDefinition } from '../Blocks/feature-grid-block.component'
import { CTABlockDefinition } from '../Blocks/cta-block.component'
import { StatsBlockDefinition } from '../Blocks/stats-block.component'
import { TestimonialsBlockDefinition } from '../Blocks/testimonials-block.component'
import { FaqAccordionBlockDefinition } from '../Blocks/faq-accordion-block.component'
import { BannerBlockDefinition } from '../Blocks/banner-block.component'
import { VideoBlockDefinition } from '../Blocks/video-block.component'
import { LogoGridBlockDefinition } from '../Blocks/logo-grid-block.component'
import { TeamBlockDefinition } from '../Blocks/team-block.component'
import { TimelineBlockDefinition } from '../Blocks/timeline-block.component'
import { PricingTableBlockDefinition } from '../Blocks/pricing-table-block.component'
import { GalleryBlockDefinition } from '../Blocks/gallery-block.component'
import { ContactFormBlockDefinition } from '../Blocks/contact-form-block.component'

export const CODE_BLOCKS: Record<string, BlockDefinition> = {
  [ProseBlockDefinition.type]:            ProseBlockDefinition,
  [CustomBlockDefinition.type]:           CustomBlockDefinition,
  [HeroBlockDefinition.type]:             HeroBlockDefinition,
  [PopupModalBlockDefinition.type]:       PopupModalBlockDefinition,
  [NavBarSimpleDefinition.type]:          NavBarSimpleDefinition,
  [NavBarMarketingDefinition.type]:       NavBarMarketingDefinition,
  [NavBarCommerceDefinition.type]:        NavBarCommerceDefinition,
  [FooterMinimalDefinition.type]:         FooterMinimalDefinition,
  [FooterColumnsDefinition.type]:         FooterColumnsDefinition,
  [FooterCommerceDefinition.type]:        FooterCommerceDefinition,
  [FeatureGridBlockDefinition.type]:      FeatureGridBlockDefinition,
  [CTABlockDefinition.type]:              CTABlockDefinition,
  [StatsBlockDefinition.type]:            StatsBlockDefinition,
  [TestimonialsBlockDefinition.type]:     TestimonialsBlockDefinition,
  [FaqAccordionBlockDefinition.type]:     FaqAccordionBlockDefinition,
  [BannerBlockDefinition.type]:           BannerBlockDefinition,
  [VideoBlockDefinition.type]:            VideoBlockDefinition,
  [LogoGridBlockDefinition.type]:         LogoGridBlockDefinition,
  [TeamBlockDefinition.type]:             TeamBlockDefinition,
  [TimelineBlockDefinition.type]:         TimelineBlockDefinition,
  [PricingTableBlockDefinition.type]:     PricingTableBlockDefinition,
  [GalleryBlockDefinition.type]:          GalleryBlockDefinition,
  [ContactFormBlockDefinition.type]:      ContactFormBlockDefinition,
}

export function getCodeBlock(type: string): BlockDefinition | undefined {
  return CODE_BLOCKS[type]
}

export function getCodeBlocks(): BlockDefinition[] {
  return Object.values(CODE_BLOCKS)
}
