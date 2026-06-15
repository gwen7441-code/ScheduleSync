# ScheduleSync

Instructor scheduling portal for first aid course coordination. The app supports:

- Admin course assignment workflow
- Instructor mobile-style login demo
- Availability updates
- Pending assignment accept/decline flow
- Admin email alert log with SendGrid delivery status
- Dataverse connectivity test hooks for IT schema mapping
- Course roster attendance updates

## Current Status

This is now an integration-ready MVP, not a fully bound production deployment.

Working locally:

- Scheduling and assignment workflow
- Local demo data persistence through `server-db.json`
- Roster status save flow
- Admin alert generation
- SendGrid live email delivery when environment variables are configured
- Dataverse OAuth/connectivity test when environment variables are configured

Still required from IT before launch:

- Confirm Microsoft Entra app registration and permissions
- Confirm Dataverse table/entity set names
- Confirm Dataverse field mappings for courses, instructors, schedules, and rosters
- Decide production authentication method, preferably Microsoft Entra SSO/MFA
- Provide SendGrid verified sender and API key
- Replace local JSON storage with Dataverse or an approved database
- Deploy behind HTTPS with normal logging, monitoring, and access controls

## Local Setup

1. Install Node.js.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in values as available.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   ```text
   http://localhost:3000
   ```

## SendGrid Setup

Live email requires all three environment variables:

```text
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
ADMIN_ALERT_EMAIL=
```

If any are missing, the portal logs admin alerts as `Simulated` instead of claiming they were sent. If SendGrid rejects a message, the log will show `Failed`.

## Dataverse Setup

Live Dataverse connectivity requires:

```text
DYNAMICS365_TENANT_ID=
DYNAMICS365_CLIENT_ID=
DYNAMICS365_CLIENT_SECRET=
DYNAMICS365_ENVIRONMENT_URL=
DYNAMICS365_COURSE_ENTITY=msevents_firstaidcourses
```

The current backend verifies OAuth and can query `contacts` plus the configured course entity set. IT still needs to map real Dataverse columns to the app's course, instructor, schedule, and roster models.

## Security Notes

- Do not store SendGrid or Microsoft client secrets in `server-db.json`.
- The demo password flow is for evaluation only. Production should use Microsoft Entra SSO/MFA.
- `/api/db` now returns a sanitized public state. It does not return passwords, OTP codes, client secrets, or SendGrid keys.
- `server-db.json` is suitable for demo persistence only. Use Dataverse or an approved database for launch.

## Useful Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```
