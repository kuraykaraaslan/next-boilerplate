import ESignatureProviderService from './e_signature.provider.service';
import ESignatureWorkflowService from './e_signature.workflow.service';

export type { InitiateLoginPurpose, InitiateLoginParams, InitiateLoginResult, LoginStatusResult } from './e_signature.workflow.service';
export { ESignatureProviderService, ESignatureWorkflowService };

export default class ESignatureService {

  // ──────────────────────────────────────────────
  // Provider Registry
  // ──────────────────────────────────────────────

  static resolveProvider    = ESignatureProviderService.resolveProvider.bind(ESignatureProviderService);
  static listCountryHints   = ESignatureProviderService.listCountryHints.bind(ESignatureProviderService);
  static listProvidersAdmin = ESignatureProviderService.listProvidersAdmin.bind(ESignatureProviderService);
  static getProviderByName  = ESignatureProviderService.getProviderByName.bind(ESignatureProviderService);
  static listProviders      = ESignatureProviderService.listProviders.bind(ESignatureProviderService);

  // ──────────────────────────────────────────────
  // Workflow
  // ──────────────────────────────────────────────

  static initiateLogin = ESignatureWorkflowService.initiateLogin.bind(ESignatureWorkflowService);
  static pollStatus    = ESignatureWorkflowService.pollStatus.bind(ESignatureWorkflowService);
}
