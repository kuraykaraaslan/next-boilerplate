const DynamicPageMessages = {
  // Pages
  PAGE_NOT_FOUND: 'Dynamic page not found',
  SLUG_TAKEN: 'A page with this slug already exists',
  PAGE_CREATE_FAILED: 'Failed to create page',
  PAGE_UPDATE_FAILED: 'Failed to update page',
  PAGE_DELETE_FAILED: 'Failed to delete page',
  PAGE_FETCH_FAILED: 'Failed to fetch page',

  // Translations
  TRANSLATION_NOT_FOUND: 'Translation not found',
  TRANSLATION_UPSERT_FAILED: 'Failed to save translation',
  TRANSLATION_DELETE_FAILED: 'Failed to delete translation',

  // Blocks
  BLOCK_NOT_FOUND: 'Block definition not found',
  BLOCK_TYPE_TAKEN: 'A block with this type already exists',
  BLOCK_CREATE_FAILED: 'Failed to create block',
  BLOCK_UPDATE_FAILED: 'Failed to update block',
  BLOCK_DELETE_FAILED: 'Failed to delete block',
  SYSTEM_BLOCK_PROTECTED: 'System blocks cannot be deleted',
  BLOCK_NO_HANDLER: 'This block has no server handler configured',
  BLOCK_HANDLER_FORBIDDEN: 'Block handler tried to access a collection it is not allowed to use',
  BLOCK_HANDLER_TIMEOUT: 'Block handler timed out',
  BLOCK_HANDLER_FAILED: 'Block handler execution failed',

  // Collections
  COLLECTION_NOT_FOUND: 'Collection not found',
  COLLECTION_SLUG_TAKEN: 'A collection with this slug already exists',
  COLLECTION_CREATE_FAILED: 'Failed to create collection',
  COLLECTION_UPDATE_FAILED: 'Failed to update collection',
  COLLECTION_DELETE_FAILED: 'Failed to delete collection',
  COLLECTION_SYSTEM_PROTECTED: 'System collections cannot be deleted',

  // Collection Items
  COLLECTION_ITEM_NOT_FOUND: 'Collection item not found',
  COLLECTION_ITEM_CREATE_FAILED: 'Failed to create collection item',
  COLLECTION_ITEM_UPDATE_FAILED: 'Failed to update collection item',
  COLLECTION_ITEM_DELETE_FAILED: 'Failed to delete collection item',
} as const

export default DynamicPageMessages
