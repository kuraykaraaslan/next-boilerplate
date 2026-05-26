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
} as const

export default DynamicPageMessages
