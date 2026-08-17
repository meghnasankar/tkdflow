# TKDflow · Backend Setup

The site is static HTML/CSS/JS. The only backend is **Supabase**, used for
authentication (email + Google) and two tables: `profiles` and `schools`.

Client config lives in one place: [`js/tkdauth.js`](js/tkdauth.js) — the
`SUPABASE_URL` and `SUPABASE_ANON` constants at the top.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**
2. Name it `tkdflow`, pick a region close to you, set a database password
3. Wait for provisioning (~2 min)

Then open **Project Settings → API** and copy two values:

| Value | Looks like |
|---|---|
| Project URL | `https://<ref>.supabase.co` |
| `anon` / publishable key | `eyJhbGci…` or `sb_publishable_…` |

Both are safe to commit — the `anon` key is a public client key, and Row
Level Security is what actually protects the data.

## 2. Create the schema

Open **SQL Editor → New query**, paste all of
[`supabase-setup.sql`](supabase-setup.sql), and click **Run**.

It creates `profiles` and `schools`, enables RLS with the right policies,
adds an `updated_at` trigger, and seeds five example schools. The file is
idempotent, so re-running it is harmless.

## 3. ⚠️ Turn OFF email confirmation

**Authentication → Sign In / Providers → Email → disable "Confirm email"**

This is not optional — registration breaks without it. Here is why:

`registerUser()` in `auth.html` calls `sb.auth.signUp()` and then
immediately inserts the profile row. With "Confirm email" enabled, `signUp`
returns a user but **no session**, so the insert runs unauthenticated,
`auth.uid()` is `null`, and the `profiles_insert_own` RLS policy rejects it.
The user sees *"Account created but profile setup failed."*

With confirmation off, `signUp` returns a live session and the insert
succeeds. (If you ever want email verification back, the profile insert has
to move into a `handle_new_user` database trigger instead.)

## 4. Redirect URLs

**Authentication → URL Configuration**

| Field | Value |
|---|---|
| Site URL | `http://localhost:8899` |
| Additional redirect URLs | `http://localhost:8899/**` |

Add your production origin here too once the site is deployed.

## 5. Google OAuth

First, in **Google Cloud Console** → *APIs & Services* → *Credentials* →
**Create OAuth client ID** → *Web application*:

- Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`

Then copy the Client ID and Client Secret into Supabase under
**Authentication → Sign In / Providers → Google**, and enable the provider.

## 6. Run the site locally

```bash
python3 -m http.server 8899
```

Then open <http://localhost:8899/index.html>.

**Do not open the pages as `file://`.** `auth.html` builds its OAuth
redirect from `window.location.origin`, which is the string `"null"` on a
`file://` page — Google sign-in fails with a redirect mismatch. The port
must also match what you registered in step 4.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| *"Account created but profile setup failed"* | "Confirm email" is still on — see step 3 |
| Google sign-in returns to a blank page | Origin missing from redirect allow-list (step 4) |
| Everything loads but nobody can log in | `SUPABASE_URL` points at a deleted project — check DNS resolves |
| Adding an existing school silently fails | `schools_update_auth` policy missing — re-run the SQL |
