import type { CountryCode, RawIdentityClaims } from './e_signature.types';
import { loadCertificate, parseDN, fingerprint, normalizeNationalId } from './e_signature.crypto.helpers';

export function parseCertificate(derOrPem: Buffer): RawIdentityClaims {
  const cert = loadCertificate(derOrPem);
  const subjectMap = parseDN(cert.subjectName.toString());
  const issuerMap = parseDN(cert.issuerName.toString());

  const fingerprintSha256 = fingerprint(cert.rawData, 'sha256');
  const serialHex = cert.serialNumber.toUpperCase();

  // TC Kimlik No is conventionally encoded in the Subject `serialNumber`
  // attribute on Turkish QSCD certificates (format: "TCKN12345678901" or
  // the bare 11-digit number). EU eIDAS QC certificates likewise put the
  // PersonalIdentifier in `2.5.4.5` (serialNumber).
  const nationalIdRaw = subjectMap['serialNumber'] ?? subjectMap['2.5.4.5'] ?? null;
  const nationalId = nationalIdRaw ? normalizeNationalId(nationalIdRaw) : null;

  return {
    commonName: subjectMap['CN'] ?? null,
    givenName: subjectMap['GN'] ?? subjectMap['2.5.4.42'] ?? null,
    familyName: subjectMap['SN'] ?? subjectMap['2.5.4.4'] ?? null,
    serialNumber: nationalIdRaw,
    nationalId,
    birthDate: null, // Some QC certs include `dateOfBirth` (2.5.4.3) but it's rare
    issuerDN: cert.issuerName.toString(),
    issuerCountry: (issuerMap['C'] as CountryCode | undefined) ?? null,
    certSerialHex: serialHex,
    certFingerprintSha256: fingerprintSha256,
    notBefore: cert.notBefore.toISOString(),
    notAfter: cert.notAfter.toISOString(),
  };
}
