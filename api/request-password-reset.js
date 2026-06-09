import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const RESEND_SEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL =
  "Hurricane Hearts <notifications@hurricanehearts.org>";
const RESET_RATE_LIMIT_MS = 60 * 1000;
const IP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const IP_RATE_LIMIT_MAX_REQUESTS = 10;
const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, a password reset email has been sent. Please check your inbox and junk folder.";
const NO_REPLY_NOTICE =
  "NOTE: Do NOT reply to this message! This email account is not monitored.";

function setCorsHeaders(response) {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.EMAIL_API_ALLOWED_ORIGIN || "*"
  );
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  throw new Error("Firebase Admin credentials are not configured.");
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = parseServiceAccount();

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
  });
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return request.body ? JSON.parse(request.body) : {};
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRequestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "unknown";
}

function getRateLimitRef(db, value) {
  const rateLimitId = createHash("sha256").update(value).digest("hex");
  return db.doc(`passwordResetRateLimits/${rateLimitId}`);
}

async function isEmailRateLimited(db, email) {
  const rateLimitRef = getRateLimitRef(db, `email:${email}`);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const lastRequestedAt = snapshot.data()?.lastRequestedAt?.toMillis?.() || 0;

    if (now - lastRequestedAt < RESET_RATE_LIMIT_MS) {
      return true;
    }

    transaction.set(rateLimitRef, {
      lastRequestedAt: FieldValue.serverTimestamp()
    });
    return false;
  });
}

async function isIpRateLimited(db, ipAddress) {
  const rateLimitRef = getRateLimitRef(db, `ip:${ipAddress}`);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const data = snapshot.data() || {};
    const windowStartedAt = data.windowStartedAt?.toMillis?.() || 0;
    const requestCount = Number(data.requestCount) || 0;

    if (now - windowStartedAt >= IP_RATE_LIMIT_WINDOW_MS) {
      transaction.set(rateLimitRef, {
        windowStartedAt: FieldValue.serverTimestamp(),
        requestCount: 1
      });
      return false;
    }

    if (requestCount >= IP_RATE_LIMIT_MAX_REQUESTS) {
      return true;
    }

    transaction.update(rateLimitRef, {
      requestCount: requestCount + 1
    });
    return false;
  });
}

async function sendResetEmail({ email, displayName, resetLink }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const firstName = String(displayName || "").trim().split(/\s+/)[0] || "there";
  const subject = "Reset your Hurricane Hearts password";
  const text = `Hi ${firstName},

A password reset was requested for your Hurricane Hearts account.

Reset your password:
${resetLink}

This secure link expires and can only be used once. If you did not request a password reset, you can ignore this email.

${NO_REPLY_NOTICE}`;
  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>A password reset was requested for your Hurricane Hearts account.</p>
<p><a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Reset Password</a></p>
<p>This secure link expires and can only be used once. If you did not request a password reset, you can ignore this email.</p>
<p><strong>NOTE:</strong> Do NOT reply to this message! This email account is not monitored.</p>`;
  const payload = {
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    to: [email],
    subject,
    text,
    html
  };

  if (process.env.RESEND_DRY_RUN === "true") {
    return { status: "dry-run", payload };
  }

  const resendResponse = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    throw new Error(
      body?.message ||
        `Resend password reset email failed with HTTP ${resendResponse.status}.`
    );
  }

  return { status: "sent", resendId: body.id || "" };
}

async function recordEmail(db, email, result, status, errorMessage = "") {
  await db.collection("mailQueue").add({
    to: [email],
    type: "password-reset",
    message: {
      subject: "Reset your Hurricane Hearts password"
    },
    status,
    delivery: "serverless-api",
    dryRunPayload: result?.payload || null,
    resendId: result?.resendId || "",
    errorMessage,
    createdAt: FieldValue.serverTimestamp(),
    sentAt:
      status === "sent" || status === "dry-run"
        ? FieldValue.serverTimestamp()
        : null,
    erroredAt: status === "error" ? FieldValue.serverTimestamp() : null
  });
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);

    if (!isValidEmail(email)) {
      response.status(200).json({ message: GENERIC_SUCCESS_MESSAGE });
      return;
    }

    const app = getAdminApp();
    const db = getFirestore(app);

    if (
      (await isIpRateLimited(db, getRequestIp(request))) ||
      (await isEmailRateLimited(db, email))
    ) {
      response.status(200).json({ message: GENERIC_SUCCESS_MESSAGE });
      return;
    }

    try {
      const auth = getAuth(app);
      const userRecord = await auth.getUserByEmail(email);
      const resetLink = await auth.generatePasswordResetLink(email);
      const result = await sendResetEmail({
        email,
        displayName: userRecord.displayName,
        resetLink
      });

      await recordEmail(db, email, result, result.status);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.error("Password reset delivery error:", error);
        await recordEmail(db, email, null, "error", error.message || "Unknown error");
      }
    }

    response.status(200).json({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Password reset request API error:", error);
    response.status(500).json({
      error: "Unable to request a password reset right now. Please try again later."
    });
  }
}
