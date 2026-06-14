// build.js — runs during Vercel build to inject environment variables
// into static HTML files before deployment.
//
// Required environment variables (set in Vercel dashboard):
//   SUPABASE_URL       — e.g. https://abcxyz.supabase.co
//   SUPABASE_ANON_KEY  — your project's public anon/publishable key
//
// NOTE: RESEND_API_KEY is no longer injected into any client-side file.
// It now lives only as a Supabase Edge Function secret:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
const fs   = require('fs');
const path = require('path');
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}
function patchFile(filename, replacements) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`WARN: ${filename} not found, skipping.`);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value);
    if (html.includes(placeholder)) {
      console.error(`ERROR: Placeholder ${placeholder} still present in ${filename} after replacement.`);
      process.exit(1);
    }
  }
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅  Patched ${filename}`);
}

const SUPABASE_REPLACEMENTS = {
  '__SUPABASE_URL__':      SUPABASE_URL,
  '__SUPABASE_ANON_KEY__': SUPABASE_ANON_KEY,
};

// Patch index.html (Supabase creds)
patchFile('index.html', SUPABASE_REPLACEMENTS);
// Patch waitlist-ios.html (Supabase creds)
patchFile('waitlist-ios.html', SUPABASE_REPLACEMENTS);
// Patch submit_request.html (Supabase creds — calls the send-feedback Edge Function)
patchFile('submit_request.html', SUPABASE_REPLACEMENTS);
patchFile('delete-account.html', SUPABASE_REPLACEMENTS);

console.log('');
console.log('Build summary:');
console.log(`  SUPABASE_URL      → ${SUPABASE_URL}`);
console.log(`  SUPABASE_ANON_KEY → ${SUPABASE_ANON_KEY.slice(0, 20)}…`);