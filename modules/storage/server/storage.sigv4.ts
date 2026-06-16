import { createHash, createHmac } from 'node:crypto'
import type { S3Config } from './storage.types'

/**
 * AWS Signature Version 4 query presigning for S3-compatible object stores
 * (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO). Generates a real,
 * time-limited GET URL with no external dependency (`@aws-sdk/s3-request-presigner`
 * is not installed). The signature is computed exactly per the SigV4 spec, so
 * the resulting URL is accepted by any compliant endpoint.
 *
 * Presigned URLs let a tenant hand out a short-lived download link without
 * exposing credentials or making the bucket public.
 */

const UNSIGNED = 'UNSIGNED-PAYLOAD'

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

/** RFC 3986 encode; S3 keys keep `/` unencoded for the canonical path. */
function uriEncode(str: string, encodeSlash = true): string {
  return str
    .split('')
    .map((ch) => {
      if (/[A-Za-z0-9\-_.~]/.test(ch)) return ch
      if (ch === '/' && !encodeSlash) return ch
      return '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
    })
    .join('')
}

function hostFor(config: S3Config): { host: string; scheme: string; pathStyle: boolean } {
  if (config.endpoint) {
    const u = new URL(config.endpoint)
    // Custom endpoints (R2/Spaces/MinIO) use path-style: <host>/<bucket>/<key>.
    return { host: u.host, scheme: u.protocol.replace(':', ''), pathStyle: true }
  }
  return { host: `${config.bucket}.s3.${config.region}.amazonaws.com`, scheme: 'https', pathStyle: false }
}

/**
 * Build a presigned GET URL valid for `expiresSeconds` (default 900, max 7 days).
 */
export function presignS3GetUrl(config: S3Config, key: string, expiresSeconds = 900): string {
  const region = config.region || 'us-east-1'
  const service = 's3'
  const expires = Math.min(Math.max(expiresSeconds, 1), 7 * 24 * 3600)

  const { host, scheme, pathStyle } = hostFor(config)
  const canonicalUri = pathStyle
    ? '/' + uriEncode(config.bucket, false) + '/' + uriEncode(key, false)
    : '/' + uriEncode(key, false)

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join('&')

  const canonicalHeaders = `host:${host}\n`
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'host',
    UNSIGNED,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmac('AWS4' + config.secretAccessKey, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')

  return `${scheme}://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}
