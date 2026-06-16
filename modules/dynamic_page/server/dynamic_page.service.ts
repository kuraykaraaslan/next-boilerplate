import DynamicPageCrudService from './dynamic_page.crud.service'
import DynamicPageBlockService from './dynamic_page.block.service'

export { DynamicPageCrudService, DynamicPageBlockService }

export default class DynamicPageService {

  // Pages
  static listPages         = DynamicPageCrudService.listPages.bind(DynamicPageCrudService)
  static getPage           = DynamicPageCrudService.getPage.bind(DynamicPageCrudService)
  static getPageBySlug     = DynamicPageCrudService.getPageBySlug.bind(DynamicPageCrudService)
  static createPage        = DynamicPageCrudService.createPage.bind(DynamicPageCrudService)
  static updatePage        = DynamicPageCrudService.updatePage.bind(DynamicPageCrudService)
  static deletePage        = DynamicPageCrudService.deletePage.bind(DynamicPageCrudService)

  // Translations
  static getTranslations   = DynamicPageCrudService.getTranslations.bind(DynamicPageCrudService)
  static upsertTranslation = DynamicPageCrudService.upsertTranslation.bind(DynamicPageCrudService)
  static deleteTranslation = DynamicPageCrudService.deleteTranslation.bind(DynamicPageCrudService)

  // Blocks
  static listBlocks        = DynamicPageBlockService.listBlocks.bind(DynamicPageBlockService)
  static getBlock          = DynamicPageBlockService.getBlock.bind(DynamicPageBlockService)
  static createBlock       = DynamicPageBlockService.createBlock.bind(DynamicPageBlockService)
  static updateBlock       = DynamicPageBlockService.updateBlock.bind(DynamicPageBlockService)
  static deleteBlock       = DynamicPageBlockService.deleteBlock.bind(DynamicPageBlockService)
}
