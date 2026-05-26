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

export const CODE_BLOCKS: Record<string, BlockDefinition> = {
  [ProseBlockDefinition.type]:        ProseBlockDefinition,
  [CustomBlockDefinition.type]:       CustomBlockDefinition,
  [HeroBlockDefinition.type]:         HeroBlockDefinition,
  [PopupModalBlockDefinition.type]:   PopupModalBlockDefinition,
  [NavBarSimpleDefinition.type]:      NavBarSimpleDefinition,
  [NavBarMarketingDefinition.type]:   NavBarMarketingDefinition,
  [NavBarCommerceDefinition.type]:    NavBarCommerceDefinition,
  [FooterMinimalDefinition.type]:     FooterMinimalDefinition,
  [FooterColumnsDefinition.type]:     FooterColumnsDefinition,
  [FooterCommerceDefinition.type]:    FooterCommerceDefinition,
}

export function getCodeBlock(type: string): BlockDefinition | undefined {
  return CODE_BLOCKS[type]
}

export function getCodeBlocks(): BlockDefinition[] {
  return Object.values(CODE_BLOCKS)
}
