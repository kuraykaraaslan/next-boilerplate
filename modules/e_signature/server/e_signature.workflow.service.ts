import type {
  InitiateLoginParams, InitiateLoginPurpose, InitiateLoginResult, LoginStatusResult,
} from './e_signature.workflow.types';
import { initiateLogin } from './e_signature.workflow.initiate';
import { pollStatus } from './e_signature.workflow.poll';

export type { InitiateLoginParams, InitiateLoginPurpose, InitiateLoginResult, LoginStatusResult };

/**
 * E-signature / e-identity login workflow facade. The implementation is split
 * across focused modules (`e_signature.workflow.initiate`, `.poll`, plus the
 * `e_signature.workflow.helpers` / `.types`); this class preserves the single
 * `ESignatureWorkflowService.*` entry point its callers depend on.
 */
export default class ESignatureWorkflowService {
  static initiateLogin(params: InitiateLoginParams): Promise<InitiateLoginResult> {
    return initiateLogin(params);
  }

  static pollStatus(params: { transactionId: string; ip: string | null; ua: string | null }): Promise<LoginStatusResult> {
    return pollStatus(params);
  }
}
