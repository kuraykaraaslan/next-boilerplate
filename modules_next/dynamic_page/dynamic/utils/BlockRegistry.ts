import type { BlockDefinition } from '../types'
import { ProseBlockDefinition } from '../Blocks/ProseBlock'
import { CustomBlockDefinition } from '../Blocks/CustomBlock'
import { HeroBlockDefinition } from '../Blocks/HeroBlock'
import { PopupModalBlockDefinition } from '../Blocks/PopupModalBlock'
import { NavBarSimpleDefinition } from '../Blocks/NavBarSimple'
import { NavBarMarketingDefinition } from '../Blocks/NavBarMarketing'
import { NavBarCommerceDefinition } from '../Blocks/NavBarCommerce'
import { FooterMinimalDefinition } from '../Blocks/FooterMinimal'
import { FooterColumnsDefinition } from '../Blocks/FooterColumns'
import { FooterCommerceDefinition } from '../Blocks/FooterCommerce'
import { FeatureGridBlockDefinition } from '../Blocks/FeatureGridBlock'
import { CTABlockDefinition } from '../Blocks/CTABlock'
import { StatsBlockDefinition } from '../Blocks/StatsBlock'
import { TestimonialsBlockDefinition } from '../Blocks/TestimonialsBlock'
import { FaqAccordionBlockDefinition } from '../Blocks/FaqAccordionBlock'
import { BannerBlockDefinition } from '../Blocks/BannerBlock'
import { VideoBlockDefinition } from '../Blocks/VideoBlock'
import { LogoGridBlockDefinition } from '../Blocks/LogoGridBlock'
import { TeamBlockDefinition } from '../Blocks/TeamBlock'
import { TimelineBlockDefinition } from '../Blocks/TimelineBlock'
import { PricingTableBlockDefinition } from '../Blocks/PricingTableBlock'
import { GalleryBlockDefinition } from '../Blocks/GalleryBlock'
import { ContactFormBlockDefinition } from '../Blocks/ContactFormBlock'

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
