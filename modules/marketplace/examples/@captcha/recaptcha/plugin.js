// Google reCAPTCHA verification (sandboxed). POSTs the token to Google's siteverify
// with the secret injected host-side via {{secret:captchaSecret}}. Ported from the
// built-in auth.captcha.service verify().
globalThis.__plugin = {
  providers: {
    'captcha:provider': {
      verify: async ({ token }, host) => {
        if (!token) return { success: false };
        try {
          const res = await host.http.fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
            body: 'secret={{secret:captchaSecret}}&response=' + encodeURIComponent(token),
          });
          if (res.status >= 400) return { success: false };
          return { success: !!JSON.parse(res.body).success };
        } catch (e) {
          return { success: false };
        }
      },
    },
  },
};
