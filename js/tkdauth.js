/* ═══════════════════════════════════════════════════════════════
   TKDflow Auth · Shared Supabase client + navbar helper
   ═══════════════════════════════════════════════════════════════
   ⚠️  After creating your Supabase project, replace the two
       placeholder values below with your real URL and anon key.
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://ffkwwfwrqtwejyrnkxey.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZma3d3ZndycXR3ZWp5cm5reGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzIxNTYsImV4cCI6MjA4OTcwODE1Nn0.aF9zoAeej542MreGVW5bjPUDzvQQ8Inb6VUtqlnVwH4';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Belt colour helper ── */
const BELT_COLOR_MAP = {
  'white':'#e5e7eb', 'yellow':'#f5c518', 'green':'#2e8b57',
  'blue':'#1a56a0', 'red':'#c8102e', 'black':'#1f2937'
};
function beltColor(belt) {
  if (!belt) return '#9ca3af';
  for (const [k, v] of Object.entries(BELT_COLOR_MAP)) {
    if (belt.toLowerCase().includes(k)) return v;
  }
  return '#9ca3af';
}

/* ── Update navbar based on auth state ── */
async function initNavAuth() {
  const el = document.getElementById('nav-actions');
  if (!el) return;

  const loggedOutHtml = `
    <a href="auth.html" class="btn btn-secondary btn-sm">Log In</a>
    <a href="auth.html?mode=register" class="btn btn-primary btn-sm">Join Free</a>
    <div class="hamburger" id="hamburger"><span></span><span></span><span></span></div>`;

  try {
    const { data: { session } } = await sb.auth.getSession();

    if (session) {
      const { data: p } = await sb.from('profiles')
        .select('full_name, username, belt_level')
        .eq('id', session.user.id).single();

      if (!p) {
        el.innerHTML = `
          <a href="auth.html?mode=complete" class="btn btn-gold btn-sm">⚡ Complete Profile</a>
          <button class="btn btn-secondary btn-sm" onclick="tkdSignOut()">Log Out</button>
          <div class="hamburger" id="hamburger"><span></span><span></span><span></span></div>`;
      } else {
        const initials = (p.full_name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
        const color = beltColor(p.belt_level || '');
        el.innerHTML = `
          <a href="profile.html" class="nav-user-pill">
            <span class="nav-avatar-circle" style="background:${color}">${initials}</span>
            <span class="nav-username-label">${p.username || 'Profile'}</span>
          </a>
          <button class="btn btn-secondary btn-sm" onclick="tkdSignOut()">Log Out</button>
          <div class="hamburger" id="hamburger"><span></span><span></span><span></span></div>`;
      }
    } else {
      el.innerHTML = loggedOutHtml;
    }
  } catch(e) {
    el.innerHTML = loggedOutHtml;
  }

  /* Re-wire hamburger (innerHTML replacement wipes old listeners) */
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
    document.getElementById('hamburger')?.classList.toggle('open');
  });
}

/* ── Sign out ── */
async function tkdSignOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

/* ── Guard: redirect if not authenticated ── */
async function requireAuth(redirectTo) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = redirectTo || 'auth.html'; return null; }
  return session;
}

document.addEventListener('DOMContentLoaded', initNavAuth);
