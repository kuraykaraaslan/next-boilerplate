// BankID Sweden (SE) eID provider — sandboxed. Ported from the built-in
// esign_bankid_se shell adapter. BankID's RP API uses mutual-TLS with a client
// certificate issued by Finansiell ID-Teknik; the sandbox HTTP egress can't present
// a client cert, and the built-in itself shipped the /auth + /collect flow as a stub.
// So initiate/poll reject clearly. The provider still surfaces SE in the picker.

globalThis.__plugin = {
  providers: {
    'esign:provider': {
      initiateLogin: async (_input, host) => {
        const baseUrl = await host.settings.get('bankIdSeBaseUrl');
        throw new Error(`not_implemented: BankID Sweden /auth flow requires mutual-TLS (${baseUrl || 'no base URL set'})`);
      },
      pollLoginResult: async () => {
        throw new Error('not_implemented: BankID Sweden /collect flow');
      },
    },
  },
};
