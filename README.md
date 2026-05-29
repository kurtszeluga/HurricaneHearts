# Hurricane Hearts

Hurricane Hearts is a React/Vite/Firebase app for Arlington Ridge resident
assistance requests, resident directory access, documents, notifications, and
admin account management.

## Local App Development

```bash
npm install
npm run dev
```

## Email Delivery Without Firebase Blaze

Automatic emails are sent through the serverless API route at
`api/send-email.js`. The React app calls `/api/send-email` after registration
or account approval, and the API route verifies the Firebase ID token before
sending through Resend.

Required server environment variables:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Hurricane Hearts <notifications@hurricanehearts.org>
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Set `RESEND_DRY_RUN=true` while testing to verify the flow without sending real
messages. For local end-to-end testing, run the app through a host that supports
the `/api` folder, such as `vercel dev`, or set `VITE_EMAIL_API_URL` to the
local URL for the serverless API.

## Vercel Deployment

This project is ready to deploy as a Vite app with a Vercel serverless API.
Vercel should use:

```bash
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add these environment variables in Vercel Project Settings:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Hurricane Hearts <notifications@hurricanehearts.org>
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
RESEND_DRY_RUN=true
EMAIL_API_ALLOWED_ORIGIN=https://your-vercel-domain.vercel.app
```

Keep `RESEND_DRY_RUN=true` for the first deployed test. Remove it or set it to
`false` only after the Notifications page email toggle and test registration
flow look right.

To test locally with Vercel's API runtime:

```bash
npm install -g vercel
vercel login
npm run dev:vercel
```

The older Firebase Functions implementation still lives in `functions/` as a
fallback, but deploying it requires the Firebase Blaze plan.
