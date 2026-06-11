import StoreProductCrudService from './store.product.crud.service';
import StoreProductMediaService from './store.product.media.service';

export { StoreProductCrudService, StoreProductMediaService };

/** Store product facade — split out of StoreService. */
export default class StoreProductService {

  // Product CRUD
  static createProduct    = StoreProductCrudService.createProduct.bind(StoreProductCrudService);
  static updateProduct    = StoreProductCrudService.updateProduct.bind(StoreProductCrudService);
  static getProduct       = StoreProductCrudService.getProduct.bind(StoreProductCrudService);
  static getProductDetail = StoreProductCrudService.getProductDetail.bind(StoreProductCrudService);
  static listProducts     = StoreProductCrudService.listProducts.bind(StoreProductCrudService);
  static deleteProduct    = StoreProductCrudService.deleteProduct.bind(StoreProductCrudService);

  // Images + spec values + duplicate
  static addImage           = StoreProductMediaService.addImage.bind(StoreProductMediaService);
  static removeImage        = StoreProductMediaService.removeImage.bind(StoreProductMediaService);
  static setSpecValues      = StoreProductMediaService.setSpecValues.bind(StoreProductMediaService);
  static duplicateProduct   = StoreProductMediaService.duplicateProduct.bind(StoreProductMediaService);
}
