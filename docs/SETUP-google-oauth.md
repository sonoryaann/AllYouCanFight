# Setup: Google OAuth login

This app supports an optional "Accedi con Google" flow on top of the default
anonymous play. Anonymous sign-in must remain enabled and working regardless
(see the main `README.md`) — Google login is an addition, not a replacement.

Follow these steps once per environment (they only need to be done by a
project admin; regular contributors don't need to touch this).

## 1. Google Cloud: create an OAuth client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   select (or create) the project you want to use for this app.
2. Open **APIs & Services → OAuth consent screen**.
   - Choose **External** user type (unless you have a Google Workspace org
     you want to restrict to).
   - Fill in the required fields (app name, support email, developer contact
     email). No special scopes are needed beyond the default `email`,
     `profile`, `openid`.
   - Publish the consent screen (or add test users while in "Testing" mode).
3. Open **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name it something like `sushi-counter` or `all-you-can-fight`.
   - **Authorized redirect URIs** — add exactly:

     ```
     https://hqxwujapcvthpurbymhl.supabase.co/auth/v1/callback
     ```

     (This is the Supabase project's own callback endpoint — Supabase
     handles the OAuth code exchange, not the Next.js app directly.)
5. Save. Copy the generated **Client ID** and **Client Secret** — you'll need
   both in the next step.

## 2. Supabase: enable the Google provider

1. Go to the [Supabase dashboard](https://supabase.com/dashboard) for the
   `sushi-counter` project (ref `hqxwujapcvthpurbymhl`).
2. Open **Authentication → Providers**.
3. Find **Google** in the provider list and enable it.
4. Paste the **Client ID** and **Client Secret** from step 1.
5. Save.

## 3. Supabase: allow the app's redirect URLs

1. Still under **Authentication**, open **URL Configuration**.
2. Add the following to **Redirect URLs** (one per environment you use):

   ```
   http://localhost:3000
   ```

   plus the app's production domain on Vercel, e.g.:

   ```
   https://<your-vercel-project>.vercel.app
   ```

   Include any preview-domain pattern too if you rely on Vercel preview
   deployments and want Google login to work there as well.

## Notes

- Anonymous sign-in (`ensureAnonSession`) still runs for every visitor by
  default; Google login is only offered as an upgrade path from the profile
  menu / profile page.
- Users can delete their Google-linked account (and all associated data) at
  any time from the **Profilo** page in the app.
- If Google login errors out in production but works locally, the most
  common cause is a missing redirect URL in step 3 (Vercel domain) or a
  mismatched authorized redirect URI in step 1.
