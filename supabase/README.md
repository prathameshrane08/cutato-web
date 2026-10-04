# Database setup (Supabase, free plan)

Cutato uses one Supabase project for its database and logins. Free projects are
**paused after 7 days without activity**. The site's database address then stops
working, which is what happened before. The daily cron in `vercel.json` (calls
`/api/health`) keeps the project active once the site is deployed on Vercel.

## 1. Get the project running

Open <https://supabase.com/dashboard> and find the Cutato project.

- **It shows "Paused":** click **Restore project**. It's free and takes a few
  minutes. Your data and keys are kept. Continue with step 2.
- **It's gone** (deleted after a long pause): click **New project** (choose an EU
  region such as Frankfurt), then copy the new keys from
  _Project Settings → API_ into `.env.local` and into Vercel:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Apply the schema and security rules

_SQL Editor → New query_, paste all of [`schema.sql`](./schema.sql), click **Run**.
It is safe to run more than once.

**Restored an old project?** Its tables already exist, and `schema.sql` won't
change existing columns. It will still add the security rules. Old policies
that allow everything would override the new ones, because Postgres combines
policies with OR. List what is there with:

```sql
select tablename, policyname, cmd, qual from pg_policies where schemaname = 'public' order by 1, 2;
```

Then drop any policy not created by `schema.sql`
(`drop policy "<name>" on public.<table>;`).

## 3. Auth settings

_Authentication → URL Configuration_:

- **Site URL:** your live domain, for example `https://cutato.de`
- **Redirect URLs:** `https://<your-domain>/auth/callback` and
  `https://<your-domain>/reset-password` (add the `http://localhost:3000`
  versions for local development)

## 4. Admin account

_Authentication → Users → Add user_ with your admin email and a strong password,
then set `ADMIN_EMAILS` (and `NEXT_PUBLIC_ADMIN_EMAIL`) to that email in Vercel.

## 5. Check it

After deploying, open `https://<your-domain>/api/health`. It should return
`{"ok":true,"database":"ok"}`.

## Testing the rules locally

`npm run test:db` loads `schema.sql` into an in-memory Postgres and checks every
security rule (customers, barbers, salon owners, anonymous visitors, server).
