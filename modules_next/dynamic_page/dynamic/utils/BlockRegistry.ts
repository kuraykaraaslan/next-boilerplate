import type { BlockDefinition } from '../types'
import { ProseBlockDefinition } from '../Blocks/ProseBlock'
import { CustomBlockDefinition } from '../Blocks/CustomBlock'
import { HeroBlockDefinition } from '../Blocks/HeroBlock'
import { PopupModalBlockDefinition } from '../Blocks/PopupModalBlock'

export const CODE_BLOCKS: Record<string, BlockDefinition> = {
  [ProseBlockDefinition.type]:       ProseBlockDefinition,
  [CustomBlockDefinition.type]:      CustomBlockDefinition,
  [HeroBlockDefinition.type]:        HeroBlockDefinition,
  [PopupModalBlockDefinition.type]:  PopupModalBlockDefinition,
}

export function getCodeBlock(type: string): BlockDefinition | undefined {
  return CODE_BLOCKS[type]
}

export function getCodeBlocks(): BlockDefinition[] {
  return Object.values(CODE_BLOCKS)
}
