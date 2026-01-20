export type StorageProviderType = 'aws-s3' | 'cloudflare-r2' | 'digitalocean-spaces' | 'minio'

export enum StorageFolder {
  GENERAL = 'general',
  CATEGORIES = 'categories',
  USERS = 'users',
  POSTS = 'posts',
  PROJECTS = 'projects',
  COMMENTS = 'comments',
  IMAGES = 'images',
  VIDEOS = 'videos',
  AUDIOS = 'audios',
  FILES = 'files',
  CONTENT = 'content',
}

export enum StorageExtension {
  JPEG = 'jpeg',
  JPG = 'jpg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
}

export enum StorageMimeType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  AVIF = 'image/avif',
}
