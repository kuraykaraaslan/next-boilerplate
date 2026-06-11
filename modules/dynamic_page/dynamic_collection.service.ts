import DynamicCollectionCrudService from './dynamic_collection.crud.service'
import DynamicCollectionItemService from './dynamic_collection.item.service'

export { DynamicCollectionCrudService, DynamicCollectionItemService }

export default class DynamicCollectionService {

  // Collections
  static listCollections       = DynamicCollectionCrudService.listCollections.bind(DynamicCollectionCrudService)
  static getCollection         = DynamicCollectionCrudService.getCollection.bind(DynamicCollectionCrudService)
  static getCollectionBySlug   = DynamicCollectionCrudService.getCollectionBySlug.bind(DynamicCollectionCrudService)
  static createCollection      = DynamicCollectionCrudService.createCollection.bind(DynamicCollectionCrudService)
  static updateCollection      = DynamicCollectionCrudService.updateCollection.bind(DynamicCollectionCrudService)
  static deleteCollection      = DynamicCollectionCrudService.deleteCollection.bind(DynamicCollectionCrudService)

  // Items
  static listItems             = DynamicCollectionItemService.listItems.bind(DynamicCollectionItemService)
  static getItem               = DynamicCollectionItemService.getItem.bind(DynamicCollectionItemService)
  static createItem            = DynamicCollectionItemService.createItem.bind(DynamicCollectionItemService)
  static updateItem            = DynamicCollectionItemService.updateItem.bind(DynamicCollectionItemService)
  static deleteItem            = DynamicCollectionItemService.deleteItem.bind(DynamicCollectionItemService)
  static makeDbHelper          = DynamicCollectionItemService.makeDbHelper.bind(DynamicCollectionItemService)
}
