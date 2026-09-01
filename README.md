# NSEC Eco Cultural Club Election

A transparent, three-candidate presidential election application for the Eco Cultural Club of Netaji Subhas Engineering College. The public ballot collects a member's name and a camera photo with their vote; authenticated election administrators manage candidate profiles, control voting, inspect the linked ballot register, and publish the final result.

> [!IMPORTANT]
> This is intentionally a **non-secret ballot**: authorized administrators can see each voter's name, verification photo, and chosen candidate. Obtain informed consent and publish a photo-retention policy before using it in a real election.

## Features

- Exactly three ordered candidate slots, each with an editable name, manifesto line, and photo
- EVM-inspired digital ballot unit with aligned candidate rows, blue vote buttons, and status lights
- In-browser camera capture with a preview and retake flow
- Duplicate-vote prevention using a normalized voter name
- Private voter photos in Supabase Storage
- Supabase email/password authentication for administrators
- Admin-only linked ballot register with short-lived signed photo URLs
- Audited pause/resume controls
- One-way final result declaration that closes voting and publishes totals publicly
- Candidate profiles locked once results are published
- Responsive Next.js interface with security headers

There is deliberately no ballot-editing endpoint or hidden vote-manipulation backdoor. Emergency administration is limited to pausing and resuming voting, and those actions are recorded in `audit_logs`.

## Election lifecycle

1. Apply the database migrations and create an administrator.
2. Keep voting paused while the administrator enters the three candidate profiles.
3. Resume voting from the admin dashboard.
4. Members enter their registered name, capture a photo, accept the consent notice, and press the blue button beside one candidate to submit once.
5. Pause voting if an operational issue occurs; each state change is audited.
6. Click **Declare final result** after verification. This permanently closes the election, locks candidate editing, and shows totals on the public page.

## Technology

| Layer | Technology |
| --- | --- |
| Web application | Next.js App Router, React, TypeScript |
| Database and storage | Supabase Postgres and Storage |
| Admin identity | Supabase Auth |
| Validation | Zod |
| Hosting | Vercel |

All database access goes through server-side route handlers. The service-role key is never sent to the browser, and Row Level Security is enabled without public table policies.

## Local setup

### Prerequisites

- Node.js 20.9 or newer
- npm
- A Supabase project
- Supabase CLI access (`npx supabase` is included as a development dependency)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example and fill it with values from **Supabase Dashboard → Project Settings → API**:

```bash
cp .env.example .env.local
```

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key used for Auth sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged database and Storage operations |

Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

### 3. Apply the Supabase schema

Link the local directory to your project and push both migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migrations create:

- `candidates`, `votes`, `election_settings`, `admin_users`, and `audit_logs`
- a private `voter-selfies` bucket
- a public `candidate-photos` bucket
- three placeholder candidate records
- a paused, unpublished election

### 4. Create an administrator

Create a user in **Supabase Dashboard → Authentication → Users**, then authorize that user in the SQL editor:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'admin@example.com';
```

An authenticated Supabase user is not an election administrator until its ID is present in `admin_users`.

### 5. Start the app

```bash
npm run dev
```

Open:

- Public ballot: `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

The election begins paused. Sign in as an administrator, complete the candidate profiles, and resume voting only when ready.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npx supabase migration list` | Compare local and remote migrations |
| `npx supabase db push` | Apply pending migrations |

## API overview

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/candidates` | Public | Ballot details, election state, and published totals |
| `POST /api/vote` | Public | Validate and lodge a vote with its verification photo |
| `POST /api/admin/login` | Public | Authenticate an authorized administrator |
| `POST /api/admin/logout` | Admin | Clear the administrator session |
| `GET /api/admin/results` | Admin | Read linked votes and election state |
| `PATCH /api/admin/election` | Admin | Pause or resume voting |
| `PUT /api/admin/candidates/:id` | Admin | Edit a candidate while voting is paused |
| `POST /api/admin/result` | Admin | Irreversibly publish the final result |

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add all three environment variables from `.env.example` to the Production environment.
3. Deploy with the default Next.js build settings.
4. Confirm `/api/candidates` returns the expected paused/open state.
5. Test camera capture on a real HTTPS device before opening voting.

You can also deploy with the CLI:

```bash
npx vercel
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel --prod
```

## Security and election operations

- Names alone are not strong identity verification. For a formal election, use a preloaded voter roll and unique membership IDs.
- Candidate photos are public; voter photos remain in a private bucket and are exposed only through expiring signed URLs to authorized admins.
- Use two election officers for opening, closing, and result reconciliation.
- Export and review `audit_logs` after the election.
- Rate-limit the voting endpoint at the hosting or edge layer before public use.
- Define who may inspect verification photos and delete them after the published retention period.
- Rotate the service-role key immediately if it is exposed.
- Back up the database before opening voting and again before declaring results.

## Project structure

```text
app/                  Next.js pages and server route handlers
components/           Public ballot and admin interface components
lib/                  Supabase clients, admin authorization, shared types
supabase/migrations/  Versioned database and Storage setup
supabase/schema.sql   Readable schema reference
```

## License

Released under the [MIT License](LICENSE).
