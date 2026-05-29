# Hurricane Hearts Email Functions

This is the original Firebase Functions backend for queued Resend emails. It
still works for emulator testing, but deploying Firebase Functions requires the
Firebase Blaze plan.

The app now uses the Blaze-free serverless route in `../api/send-email.js` for
production email delivery. Keep Resend and Firebase Admin secrets in the hosting
provider's server environment variables, never in the React app.

## How it works

1. The React app writes email jobs to the `mailQueue` Firestore collection.
2. `sendQueuedEmailWithResend` runs when a `mailQueue/{mailId}` document is created.
3. The function sends the email through the Resend HTTP API.
4. The queue document is updated to `sent`, `dry-run`, or `error`.

## Local dry run

From the project root:

```bash
npm run functions:dry-run
```

This validates the Resend payload without sending an email.

## Local emulator test

Create `functions/.env.local`:

```bash
RESEND_FROM_EMAIL=Hurricane Hearts <notifications@hurricanehearts.org>
RESEND_DRY_RUN=true
```

For emulator runs, also create `functions/.secret.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
```

Start Firebase emulators:

```bash
npm run emulators
```

In another terminal, start the app against the emulators:

```bash
npm run dev:emulators
```

Register a test resident. The app should create `mailQueue` documents, and the function should mark them as `dry-run`.

To test real Resend delivery locally, set `RESEND_DRY_RUN=false` in `functions/.env.local`, then restart the emulators.

## Production send

Use a verified Resend sending domain before turning off dry run. Set the secret before deploying:

```bash
npm exec firebase -- functions:secrets:set RESEND_API_KEY
```

Then set `RESEND_FROM_EMAIL` for the deployed function environment and deploy Firestore rules plus Functions.
