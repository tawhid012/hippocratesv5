# Hippocrates Beta v0.1

Hippocrates is a premium AI Clinical Copilot for healthcare professionals, powered by Oracle.

## Prerequisites

- Node.js 18+
- npm or pnpm
- A Supabase project (Free tier is sufficient)
- OpenAI API Key (or Gemini API Key)

## Supabase Setup

This beta version stores application settings, temporary admin credentials, and all case (chat) histories securely in Supabase PostgreSQL.

1. **Create a Supabase Project**
   Go to [Supabase](https://supabase.com) and create a new project.

2. **Run Migrations**
   Go to the SQL Editor in your Supabase dashboard and execute the contents of `supabase/migrations/001_initial_schema.sql`.

3. **Run Seed Data**
   Execute the contents of `supabase/seed.sql` to create the temporary beta admin user.
   - **Username:** Oracle Core
   - **Password:** Oracle@123

## Environment Variables

Copy the provided `.env.local.example` to a new file named `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

See the `.env.local.example` file for details on where to find these keys.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser.

## Administrator Access

To configure AI providers:
1. Go to `http://localhost:3000/admin`
2. Log in using the beta admin credentials (see Supabase Setup step 3).
3. Enter your OpenAI or Gemini API key, test the connection, and save.
4. Enable the provider.

## Next Steps for Production

- **Authentication:** The current `/admin` authentication uses a temporary hardcoded user with a signed cookie. Before production, replace this with Supabase Auth or a similar provider.
- **Data Privacy:** Ensure your deployment complies with HIPAA or relevant local healthcare data regulations. End-to-end encryption and proper access controls must be implemented for patient data.
# hippocrates
# hippocrates
