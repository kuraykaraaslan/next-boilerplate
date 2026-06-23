export const PRODUCT_REVIEW_MESSAGES = {
  REVIEW_NOT_FOUND: 'Review not found',
  INVALID_RATING: 'Rating must be an integer between 1 and 5',
  REVIEW_CREATE_FAILED: 'Failed to create review',
  REVIEW_UPDATE_FAILED: 'Failed to update review',
  VOTE_FAILED: 'Failed to record vote',
  INVALID_STATUS: 'Invalid review status',
  VERIFIED_PURCHASE_REQUIRED: 'Only verified purchasers may review this product',
  ALREADY_IN_STATUS: 'Review is already in the requested status',
  REVIEW_APPROVED: 'Review approved',
  REVIEW_REJECTED: 'Review rejected',
  REVIEW_MARKED_SPAM: 'Review marked as spam',
} as const
