import { describe, it, expect } from 'vitest';
import { signDetachedCms, verifyDetachedCms } from '../auth_oidc.cms';

// Self-signed RSA test fixture (openssl). Used only to prove the CMS primitive
// signs and verifies — NOT a real ESIA credential.
const CERT_PEM = '-----BEGIN CERTIFICATE-----\nMIIDCTCCAfGgAwIBAgIUXr7CQ3kPrkwSnqCJMFEOQL1ypqIwDQYJKoZIhvcNAQEL\nBQAwFDESMBAGA1UEAwwJZXNpYS10ZXN0MB4XDTI2MDYxMzIyMDMwM1oXDTM2MDYx\nMDIyMDMwM1owFDESMBAGA1UEAwwJZXNpYS10ZXN0MIIBIjANBgkqhkiG9w0BAQEF\nAAOCAQ8AMIIBCgKCAQEAzS15wBQlymgYjBCQrPmoPjBCTKBXXvEjYFg/6mFAI45v\nN/eik6SHKaZqhoU63D4vLKsL6jkJemMUt9S0y3hoqkuGqPbgf61QfpFwClmgYP1B\n1SjwSj2on4zquvQpmCTJUNcL+zBn/IVZ2OUHnY8ceRljIap5qZ6Gyy2VY6QHAtT/\nJD6n49+aT8hnieDxz/S0CPy3XTAeEBlSy+yDdLCmFPdPLf2buDan7bNsZ05yIMnv\nwN2Tv0FTDp6M3gzf9x3xKQzHFrXcev+fmGTprhFzpDeM/xXSHwE7uUD+L0zkRTEi\nkqwZSYJZ7UXd3//RQp73jySPgxiHd9kzRA4V5TMCgwIDAQABo1MwUTAdBgNVHQ4E\nFgQUbLUYiIWUV6qeexg4nRN9WEJWiD0wHwYDVR0jBBgwFoAUbLUYiIWUV6qeexg4\nnRN9WEJWiD0wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEANlHy\n+iXq7PA8FffKzOn7LaawWNnJnD2u2ImQTGqvxieIbQMGGJsg5wNTbCN3zjWM0nrg\ntG/LnvTMyMxa4ViPiNjkfGcxmcqYDyc/Zol/+aaKCWgTBlmcosHrAVt8ewBX76Dn\nAGXJIt0k0dz+cbmehmqTIKNUVKTq9fRcHwqd289O1m63KYVs9TmTQIkwv/GS+wqh\nsLJOJE6LIMObReNB3Qxb/sjkwzlnJr/Uyt174z9QfaExtj6dvFJkqbnCS7ReFwje\nPey39/BMF9t+B2nKBTGLLEobIbWvLYLPLOmyIlvdPqlMVwAwNV6ldmYaKJMDpUeb\nDURmtJwefQZ48zMN6g==\n-----END CERTIFICATE-----\n';
const KEY_PEM = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNLXnAFCXKaBiM\nEJCs+ag+MEJMoFde8SNgWD/qYUAjjm8396KTpIcppmqGhTrcPi8sqwvqOQl6YxS3\n1LTLeGiqS4ao9uB/rVB+kXAKWaBg/UHVKPBKPaifjOq69CmYJMlQ1wv7MGf8hVnY\n5Qedjxx5GWMhqnmpnobLLZVjpAcC1P8kPqfj35pPyGeJ4PHP9LQI/LddMB4QGVLL\n7IN0sKYU908t/Zu4Nqfts2xnTnIgye/A3ZO/QVMOnozeDN/3HfEpDMcWtdx6/5+Y\nZOmuEXOkN4z/FdIfATu5QP4vTORFMSKSrBlJglntRd3f/9FCnvePJI+DGId32TNE\nDhXlMwKDAgMBAAECggEAI1SCU33kp/7Wwz+S+gYfX14F/JXblaCmO8/WabCHT9gV\n9KgymYPKNnTOgQ1t/kDC9MkbSyC5LhbjmWgKHcNFGpXYwT2JmNKqOrEmftHCGRFj\nBaaAAfiuEZM9VCX5B5bGB6KQEJfcQBJiT0PY1NuwxnWFqWVmf7upcFEQGVFEV8sw\nmhe9MN6lPHhZZ3ac150lgKy6U3olren7LXAbVbp3YsiR46H2qrAqf3RrXQoxN5bn\nJAHZGfsKG1iA539asTNmN27TRDB1YeOnr+RuBEXTyrswYCsR0Fa98I24EtA2sCRH\n8Leoz0RSGfT9SgAz0l6psOFyHj8jUI3OXH5VFM/uiQKBgQDls7ZbITdqQWIZ3ZAr\npJKOBS6xmGnhwL0z2hvb/MDuq1xqAEC+uuiN13qlqHc6rh0OsTEbwUMHQ/9d/W/B\nj7Cxsq5/dX2Q7GjRc5chm/xE3xkPisYNtYEg2zbpLjPdNQd9y2dEi2w8bvS9ewV6\n6gN5eIUezH7A3aE69+lvTLdg7QKBgQDkqvvfliFM6K8UZdU5ikZhIs9WlzCC2+DZ\nPy/kEFauVTZXE0pXuR4qEM1MjcKuTKzc0jho7ueWHxY6bI0wihZa3qCj46XT9DG7\nB9UcX/DuPcIdSNwY0EvPTAYe4gNItJWIFPlYnKsf3nn6Av2EaAWt9srta2q244LV\nD5TK0f0zLwKBgFB5+yzIYXLfv3ASeT1hJluNo0Njg80tStyM0O/tCOdVsEYPGp/4\nOhvf37+EW2l6sQGBwRPZTRORljmm3m2xWxWW5Z4QWtLYkQy48705ulOi2lPgqe0J\np1kMlJtzrYYV2y8OgXq5Yk12DlcIb+4VaOw49mLJAKuvupo/W1C8Tw8tAoGBAMM2\nyXJWi7VJy/YA/ahyyKSygAlvZyXAKtOsoujzndyUuKBbwpLjYcINuAaL21DL+qNG\nAIxssF6zyVk1RM/Ug0MuXjur4+zvwujlxeTEbz4kkSxJAEVaxe2B/JOu5ZjTOfkD\n1t70WQ8K8l0i4mWAHKEoWJOZqW/bCN11wNPps1xXAoGAZJyDsJCcsOOaRaOJuE7z\nDTXPvHRnJgwKq9aaixCK3RrcbXQOCE/X8A4ju/9sgTNAzNT5QoV6aXUtwCZyFwR2\nyhTzJQ4nTzwcfRof8sgH8MWBEmf8ANjrsg3257hbAtwasLtsm3sRUkDyJUE7zkjl\nwng82l47Ydhsy8UjTlI2/UA=\n-----END PRIVATE KEY-----\n';

describe('PKCS#7 detached CMS signer (ESIA client_secret format)', () => {
  it('signs detached and verifies against the original data', async () => {
    const data = Buffer.from('openidexample-scope1700000000000client-1state-xyz', 'utf8');
    const cms = await signDetachedCms(data, CERT_PEM, KEY_PEM);
    expect(typeof cms).toBe('string');
    expect(cms.length).toBeGreaterThan(100);
    expect(await verifyDetachedCms(cms, data)).toBe(true);
  });

  it('fails verification when the signed data differs', async () => {
    const cms = await signDetachedCms(Buffer.from('original', 'utf8'), CERT_PEM, KEY_PEM);
    expect(await verifyDetachedCms(cms, Buffer.from('tampered', 'utf8'))).toBe(false);
  });
});
