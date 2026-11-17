/* ═══════════════════════════════════════════════════════════════
   TKDflow · Public site configuration
   ───────────────────────────────────────────────────────────────
   Everything in this file is shipped to every visitor's browser.
   Only put PUBLIC values here (the Supabase project URL and its
   public anon/publishable key are public by design; Row Level
   Security is what protects data). Never put a service-role key,
   database password or OAuth client secret in this file.

   ACCOUNT SERVICE STATUS (2026-11-17)
   The original production project was recovered under Meghna's account.
   Owner-approved registration is protected by the server enrollment hook,
   email confirmation and private profile policies. Google is email-first:
   confirm an account, connect Google, then use it for subsequent sign-in.
   The school directory and private review queue are installed in production.
   The owner approved production activation; see docs/account-age-policy.md.
   ═══════════════════════════════════════════════════════════════ */

export const SITE = Object.freeze({
  name: 'TKDflow',
  origin: 'https://tkdflow.com',
});

export const ACCOUNTS = Object.freeze({
  /** Master switch. false = every account screen shows the paused state. */
  enabled: true,

  /** Shown to visitors while accounts are switched off. */
  disabledReason:
    'Sign-in is temporarily unavailable while TKDflow reconnects its account service. ' +
    'All learning resources are available without an account.',

  /** Public Supabase project settings (Project Settings → API). */
  supabaseUrl: "https://ffkwwfwrqtwejyrnkxey.supabase.co",
  supabaseAnonKey: "sb_publishable_Q3OpTXWzo3EhvG86dWEQRA_oaN8QHyy",

  /** UI registration switch. The server independently requires a screened,
   *  single-use enrollment ticket and confirmed email. Disable server signups
   *  as well as this UI switch if account creation needs to be paused. */
  signupEnabled: true,

  /** Google sign-in. Requires the provider and redirect URLs to be configured. */
  googleEnabled: true,

  /** Exact SDK build. 2.119.0 was the npm `latest` release on 2026-11-15
   *  (published 2026-11-04). The integrity hash was computed from
   *  dist/umd/supabase.js in the npm tarball; before enabling accounts,
   *  confirm the CDN serves identical bytes (SETUP.md → "Pinning the SDK").
   *  Behaviour relied on and checked in this release's auth-js source:
   *  signOut({ scope: 'local' }) clears the local session before the network
   *  request; default flowType is 'implicit'. */
  sdk: Object.freeze({
    url: '/vendor/supabase/supabase-2.119.0.js',
    integrity: 'sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O',
  }),

  /** How long to wait for the account service before showing "unavailable". */
  timeoutMs: 8000,
});
