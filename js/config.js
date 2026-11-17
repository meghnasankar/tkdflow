/* ═══════════════════════════════════════════════════════════════
   TKDflow · Public site configuration
   ───────────────────────────────────────────────────────────────
   Everything in this file is shipped to every visitor's browser.
   Only put PUBLIC values here (the Supabase project URL and its
   public anon/publishable key are public by design; Row Level
   Security is what protects data). Never put a service-role key,
   database password or OAuth client secret in this file.

   ACCOUNT SERVICE STATUS (2026-11-15)
   The previous Supabase host failed DNS (NXDOMAIN) during the
   audit, so member accounts are switched OFF here. Do not guess a
   replacement project. To restore accounts, follow
   "Restoring member accounts" in SETUP.md — in particular:
     1. apply supabase-setup.sql to the intended project and run
        the permission tests against staging,
     2. confirm the privacy / audience (minimum age) model,
     3. fill in supabaseUrl + supabaseAnonKey + sdk.integrity,
     4. set enabled: true (and signupEnabled only when approved).
   `npm test` refuses an enabled config that lacks these values.
   ═══════════════════════════════════════════════════════════════ */

export const SITE = Object.freeze({
  name: 'TKDflow',
  origin: 'https://tkdflow.com',
});

export const ACCOUNTS = Object.freeze({
  /** Master switch. false = every account screen shows the paused state. */
  enabled: false,

  /** Shown to visitors while accounts are switched off. */
  disabledReason:
    'Sign-in is temporarily unavailable while TKDflow reconnects its account service. ' +
    'All learning resources are available without an account.',

  /** Public Supabase project settings (Project Settings → API). */
  supabaseUrl: '',
  supabaseAnonKey: '',

  /** New registrations — UI ONLY. This flag merely hides the sign-up form;
   *  it cannot stop anyone calling the Supabase Auth API directly. Until the
   *  owner approves the audience, privacy and retention model (tracker #2,
   *  #30), the Supabase project itself must also block new users:
   *  Authentication → Sign In / Providers → "Allow new users to sign up" OFF
   *  (this also stops Google/OAuth from creating accounts). */
  signupEnabled: false,

  /** Google sign-in. Requires the provider and redirect URLs to be configured. */
  googleEnabled: false,

  /** Exact SDK build. 2.119.0 was the npm `latest` release on 2026-11-15
   *  (published 2026-11-04). The integrity hash was computed from
   *  dist/umd/supabase.js in the npm tarball; before enabling accounts,
   *  confirm the CDN serves identical bytes (SETUP.md → "Pinning the SDK").
   *  Behaviour relied on and checked in this release's auth-js source:
   *  signOut({ scope: 'local' }) clears the local session before the network
   *  request; default flowType is 'implicit'. */
  sdk: Object.freeze({
    url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js',
    integrity: 'sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O',
  }),

  /** How long to wait for the account service before showing "unavailable". */
  timeoutMs: 8000,
});
