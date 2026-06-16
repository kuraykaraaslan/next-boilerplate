import redis from '@nb/redis'

export async function bustReview(tenantId: string, reviewId: string): Promise<void> {
  await redis.del(`review:${tenantId}:${reviewId}`).catch(() => {})
}

export async function bustSummary(tenantId: string, productId: string): Promise<void> {
  await redis.del(`review:summary:${tenantId}:${productId}`).catch(() => {})
}
