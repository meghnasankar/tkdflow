# TKDFlow authentication emails

Prepared templates for Supabase's hosted Confirm sign up and Reset password editors. They are not applied automatically by a Vercel deployment. Use the subject in `subjects.json` and the matching HTML body, first on staging, then the original project after delivery and link tests pass.

Both templates use Supabase's `{{ .ConfirmationURL }}` so the service retains its verification type and configured return URL. Do not add a real token or confirmation link to these files. The templates contain no external images, remote fonts, tracking or recipient data. Resend domain open and click tracking must remain off.

The sender is configured separately in Supabase SMTP settings. Credentials belong only in those settings and must never be added here. The public support alias will be added to emails only after its delivery test passes.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates
