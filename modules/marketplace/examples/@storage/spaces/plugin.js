// S3-compatible storage backend (sandboxed). Signs PutObject/DeleteObject with AWS
// SigV4 (path-style) using host.crypto.hmac/hash; the secret access key never enters
// the isolate (the SigV4 key chain keys off it host-side). File bytes are PUT via the
// host.http `bodyBase64` option. Non-secret config (bucket/region/endpoint) is read
// from the plugin's settings; getConfig hands it to the host facade for sync URL
// building. Works for AWS S3 + any S3-compatible endpoint (MinIO / R2 / Spaces).

async function cfg(host) {
  const [bucket, region, endpoint, accessKeyId] = await Promise.all([
    host.settings.get('s3Bucket'),
    host.settings.get('s3Region'),
    host.settings.get('s3Endpoint'),
    host.settings.get('s3AccessKey'),
  ]);
  return { bucket: bucket || '', region: region || 'us-east-1', endpoint: endpoint || '', accessKeyId: accessKeyId || '' };
}

function encodeKey(key) { return String(key).split('/').map(encodeURIComponent).join('/'); }

async function signedFetch(host, c, method, key, bodyBase64, contentType) {
  const baseUrl = (c.endpoint || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('s3Endpoint not configured');
  if (!c.bucket) throw new Error('s3Bucket not configured');
  const hostName = new URL(baseUrl).host;
  const canonicalUri = '/' + c.bucket + '/' + encodeKey(key);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const ct = contentType || 'application/octet-stream';

  const payloadHash = bodyBase64 != null && bodyBase64 !== ''
    ? await host.crypto.hash([{ value: bodyBase64, encoding: 'base64' }], { algorithm: 'sha256', outputEncoding: 'hex' })
    : await host.crypto.hash([], { algorithm: 'sha256', outputEncoding: 'hex' });

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method, canonicalUri, '',
    'content-type:' + ct, 'host:' + hostName, 'x-amz-content-sha256:' + payloadHash, 'x-amz-date:' + amzDate,
    '', signedHeaders, payloadHash,
  ].join('\n');
  const crHash = await host.crypto.hash([{ value: canonicalRequest, encoding: 'utf8' }], { algorithm: 'sha256', outputEncoding: 'hex' });
  const credentialScope = dateStamp + '/' + c.region + '/s3/aws4_request';
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, crHash].join('\n');

  const kDate = await host.crypto.hmac(dateStamp, { secretName: 's3SecretKey', prefix: 'AWS4', algorithm: 'sha256', encoding: 'hex' });
  const kRegion = await host.crypto.hmac(c.region, { key: { value: kDate, encoding: 'hex' }, encoding: 'hex' });
  const kService = await host.crypto.hmac('s3', { key: { value: kRegion, encoding: 'hex' }, encoding: 'hex' });
  const kSigning = await host.crypto.hmac('aws4_request', { key: { value: kService, encoding: 'hex' }, encoding: 'hex' });
  const signature = await host.crypto.hmac(stringToSign, { key: { value: kSigning, encoding: 'hex' }, encoding: 'hex' });

  const authorization = 'AWS4-HMAC-SHA256 Credential=' + c.accessKeyId + '/' + credentialScope +
    ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;
  const init = { method, headers: { 'content-type': ct, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, authorization } };
  if (bodyBase64 != null) init.bodyBase64 = bodyBase64;
  return host.http.fetch(baseUrl + canonicalUri, init);
}

globalThis.__plugin = {
  providers: {
    'storage:provider': {
      getConfig: async (_input, host) => {
        const c = await cfg(host);
        return { bucket: c.bucket, region: c.region, endpoint: c.endpoint || null };
      },
      putObject: async ({ key, contentBase64, contentType }, host) => {
        const res = await signedFetch(host, await cfg(host), 'PUT', key, contentBase64 || '', contentType);
        if (res.status >= 300) throw new Error('S3 PutObject ' + res.status + ': ' + String(res.body).slice(0, 200));
        return { ok: true };
      },
      deleteObject: async ({ key }, host) => {
        const res = await signedFetch(host, await cfg(host), 'DELETE', key, null, null);
        if (res.status >= 300 && res.status !== 204) throw new Error('S3 DeleteObject ' + res.status);
        return { ok: true };
      },
    },
  },
};
