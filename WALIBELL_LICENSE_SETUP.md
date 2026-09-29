# WaliBell License Manager

Web admin: `/walibell-license/`

## Supabase setup

1. In Supabase Authentication > Users, create one private admin user.
2. Set the Edge Function secrets:
   - `WALIBELL_ADMIN_EMAIL` = the exact admin email
   - `SUPABASE_PUBLISHABLE_KEY` = the project publishable key (if not auto-provided)
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key (server-side only)
3. Deploy `supabase/functions/manage-licenses/index.ts` as the `manage-licenses` Edge Function.
4. Keep JWT verification ON for this function.

The web page never receives the service-role key. It only uses the publishable key and the signed-in user's session JWT.

GitHub Pages deployment already exists in this repository. After push, the page is available under:
`https://kasmirhdm.github.io/WaliNet-PWA/walibell-license/`
