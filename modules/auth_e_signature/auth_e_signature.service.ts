import ESignatureWorkflowService from '@/modules/e_signature/e_signature.workflow.service';
import AuthESignatureFlowService from './auth_e_signature.flow.service';
import AuthESignatureCertService from './auth_e_signature.cert.service';

export type { ESignatureLoginResult } from './auth_e_signature.types';
export { AuthESignatureFlowService, AuthESignatureCertService };

/**
 * E-signature identity login — the auth-layer facade over the `e_signature`
 * engine. Mirrors the `auth_acs` / `auth_sso` consumer pattern: the engine owns
 * provider/crypto/identity primitives; this module owns user matching, the
 * certificate↔user binding and the login/bind workflow.
 */
export default class AuthESignatureService {
  // Initiate a login/bind challenge (delegates to the engine workflow).
  static initiate = ESignatureWorkflowService.initiateLogin.bind(ESignatureWorkflowService);

  // Complete a login/bind: verify (engine) → match/bind + webhooks (auth).
  static completeLogin = AuthESignatureFlowService.completeLogin.bind(AuthESignatureFlowService);

  // Certificate↔user binding store.
  static findCertsByUser = AuthESignatureCertService.findByUser.bind(AuthESignatureCertService);
  static findCertByFingerprint = AuthESignatureCertService.findByFingerprint.bind(AuthESignatureCertService);
  static bindCert = AuthESignatureCertService.bind.bind(AuthESignatureCertService);
  static revokeCert = AuthESignatureCertService.revoke.bind(AuthESignatureCertService);
}
