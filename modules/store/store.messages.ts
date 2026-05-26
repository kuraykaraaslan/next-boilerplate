export const STORE_MESSAGES = {
  CATEGORY_NOT_FOUND: 'Category not found',
  CATEGORY_CREATE_FAILED: 'Failed to create category',
  CATEGORY_UPDATE_FAILED: 'Failed to update category',
  CATEGORY_HAS_PRODUCTS: 'Cannot delete a category that contains products',
  CATEGORY_SLUG_TAKEN: 'A category with this slug already exists',

  SPEC_NOT_FOUND: 'Category spec not found',
  SPEC_KEY_DUPLICATE: 'A spec with this key already exists in the category',

  PRODUCT_NOT_FOUND: 'Product not found',
  PRODUCT_CREATE_FAILED: 'Failed to create product',
  PRODUCT_UPDATE_FAILED: 'Failed to update product',
  PRODUCT_SLUG_TAKEN: 'A product with this slug already exists',
  PRODUCT_INSUFFICIENT_STOCK: 'Insufficient stock for this product',

  VARIANT_NOT_FOUND: 'Product variant not found',
  VARIANT_CREATE_FAILED: 'Failed to create product variant',
  VARIANT_DUPLICATE_OPTIONS: 'A variant with this option combination already exists',

  VARIATION_TYPE_NOT_FOUND: 'Variation type not found',
  VARIATION_OPTION_NOT_FOUND: 'Variation option not found',

  IMAGE_NOT_FOUND: 'Product image not found',
  IMAGE_UPLOAD_FAILED: 'Failed to upload product image',

  BUNDLE_NOT_FOUND: 'Bundle not found',
  BUNDLE_CREATE_FAILED: 'Failed to create bundle',
  BUNDLE_UPDATE_FAILED: 'Failed to update bundle',
  BUNDLE_SLUG_TAKEN: 'A bundle with this slug already exists',
  BUNDLE_ITEM_NOT_FOUND: 'Bundle item not found',
  BUNDLE_ITEM_DUPLICATE: 'This product variant is already in the bundle',
} as const
