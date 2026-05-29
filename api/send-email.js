import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PRIMARY_ADMIN_EMAIL = "hurricanehearts.admin@gmail.com";
const RESEND_SEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL =
  "Hurricane Hearts <notifications@hurricanehearts.org>";

function getAllowedOrigin() {
  return process.env.EMAIL_API_ALLOWED_ORIGIN || "*";
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", getAllowedOrigin());
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );
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

  throw new Error(
    "Firebase Admin credentials are not configured for the email API."
  );
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

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  const match = header.match(/^Bearer (.+)$/i);

  return match ? match[1] : "";
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

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function validateEmail(email) {
  const to = normalizeRecipients(email.to);
  const subject = email.message?.subject?.trim();
  const text = email.message?.text?.trim();
  const html = email.message?.html?.trim();

  if (to.length === 0) {
    throw new Error("Email is missing a recipient.");
  }

  if (!subject) {
    throw new Error("Email is missing a subject.");
  }

  if (!text && !html) {
    throw new Error("Email is missing message text/html.");
  }

  return {
    ...email,
    to,
    message: {
      subject,
      text,
      html
    }
  };
}

function buildResendPayload(email) {
  const valid = validateEmail(email);

  return {
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    to: valid.to,
    subject: valid.message.subject,
    text: valid.message.text,
    html: valid.message.html
  };
}

function shouldDryRun() {
  return process.env.RESEND_DRY_RUN === "true";
}

async function sendWithResend(email) {
  const payload = buildResendPayload(email);

  if (shouldDryRun()) {
    return {
      dryRun: true,
      payload
    };
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.message || `Resend email send failed with HTTP ${response.status}.`
    );
  }

  return {
    dryRun: false,
    resendId: body.id || ""
  };
}

async function getAdminRecipients(db) {
  const settingsSnap = await db.doc("system/emailSettings").get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  let recipients = normalizeRecipients(settings.adminNotificationRecipients);

  if (recipients.length === 0) {
    const activeEventSnap = await db.doc("system/activeEvent").get();
    const activeEvent = activeEventSnap.exists ? activeEventSnap.data() : {};

    recipients = normalizeRecipients(
      activeEvent.emailSettings?.adminNotificationRecipients
    );
  }

  return recipients.length > 0 ? recipients : [PRIMARY_ADMIN_EMAIL];
}

async function getEmailEnabled(db) {
  const settingsSnap = await db.doc("system/emailSettings").get();

  if (settingsSnap.exists) {
    const settings = settingsSnap.data() || {};

    if (typeof settings.emailEnabled === "boolean") {
      return settings.emailEnabled;
    }
  }

  const activeEventSnap = await db.doc("system/activeEvent").get();
  const activeEvent = activeEventSnap.exists ? activeEventSnap.data() : {};

  return activeEvent.emailSettings?.emailEnabled !== false;
}

async function getUserProfile(db, uid) {
  const snap = await db.doc(`users/${uid}`).get();

  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getActiveApprovedUsers(db) {
  const snap = await db
    .collection("users")
    .where("active", "==", true)
    .where("approved", "==", true)
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((user) => user.email);
}

async function getRequest(db, requestId) {
  const snap = await db.doc(`requests/${requestId}`).get();

  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

function isAdminProfile(profile, decodedToken) {
  return (
    profile?.role === "admin" ||
    profile?.email === PRIMARY_ADMIN_EMAIL ||
    decodedToken.email === PRIMARY_ADMIN_EMAIL
  );
}

async function authorizeEmail({ db, decodedToken, email }) {
  if (email.type === "admin-blast-active-users") {
    const adminProfile = await getUserProfile(db, decodedToken.uid);

    if (!isAdminProfile(adminProfile, decodedToken)) {
      throw new Error("Only admins can send blast emails.");
    }

    const subject = email.message?.subject?.trim();
    const text = email.message?.text?.trim();
    const html = email.message?.html?.trim();

    if (!subject || (!text && !html)) {
      throw new Error("Blast email is missing a subject or message.");
    }

    const users = await getActiveApprovedUsers(db);

    if (users.length === 0) {
      throw new Error("No active approved users have email addresses.");
    }

    return users.map((user) => ({
      ...email,
      to: [user.email],
      targetUid: user.uid || user.id,
      targetName: user.name || user.email || "User"
    }));
  }

  if (
    email.type === "access-request-welcome" ||
    email.type === "admin-access-request"
  ) {
    const accessRequestUid = email.accessRequestUid;

    if (!accessRequestUid) {
      throw new Error("Email is missing an access request user id.");
    }

    if (decodedToken.uid !== accessRequestUid) {
      throw new Error("Registration emails can only be sent by that user.");
    }

    const requestProfile = await getUserProfile(db, accessRequestUid);

    if (!requestProfile) {
      throw new Error("Access request profile was not found.");
    }

    if (requestProfile.approved !== false) {
      throw new Error("Registration emails are only sent for pending users.");
    }

    if (email.type === "access-request-welcome") {
      const recipients = normalizeRecipients(email.to);

      if (
        recipients.length !== 1 ||
        recipients[0].toLowerCase() !==
          String(requestProfile.email || "").toLowerCase()
      ) {
        throw new Error("Welcome email recipient must match the new user.");
      }

      return email;
    }

    return {
      ...email,
      to: await getAdminRecipients(db)
    };
  }

  if (email.type === "account-approved") {
    const accessRequestUid = email.accessRequestUid;

    if (!accessRequestUid) {
      throw new Error("Email is missing an access request user id.");
    }

    const adminProfile = await getUserProfile(db, decodedToken.uid);

    if (!isAdminProfile(adminProfile, decodedToken)) {
      throw new Error("Only admins can send account approval emails.");
    }

    const approvedProfile = await getUserProfile(db, accessRequestUid);
    const recipients = normalizeRecipients(email.to);

    if (
      !approvedProfile ||
      approvedProfile.approved === false ||
      recipients.length !== 1 ||
      recipients[0].toLowerCase() !==
        String(approvedProfile.email || "").toLowerCase()
    ) {
      throw new Error("Approval email recipient must match the approved user.");
    }

    return email;
  }

  if (
    email.type === "request-claimed-requestor" ||
    email.type === "request-claimed-claimant"
  ) {
    const request = await getRequest(db, email.requestId);

    if (!request) {
      throw new Error("Request was not found.");
    }

    const claim = (request.claimCommitments || []).find(
      (item) => item.uid === email.claimUid
    );

    if (!claim) {
      throw new Error("Request claim was not found.");
    }

    const adminProfile = await getUserProfile(db, decodedToken.uid);
    const isAdmin = isAdminProfile(adminProfile, decodedToken);

    if (
      !isAdmin &&
      decodedToken.uid !== claim.uid &&
      decodedToken.uid !== claim.claimedByUid
    ) {
      throw new Error("Only the claimant or an admin can send claim emails.");
    }

    if (email.type === "request-claimed-requestor") {
      return {
        ...email,
        to: [request.residentEmail]
      };
    }

    return {
      ...email,
      to: [claim.email]
    };
  }

  if (
    email.type === "request-cancelled-requestor" ||
    email.type === "request-cancelled-admin"
  ) {
    const request = await getRequest(db, email.requestId);

    if (!request) {
      throw new Error("Request was not found.");
    }

    const adminProfile = await getUserProfile(db, decodedToken.uid);
    const isAdmin = isAdminProfile(adminProfile, decodedToken);

    if (!isAdmin && decodedToken.uid !== request.residentUid) {
      throw new Error("Only the requestor or an admin can send cancellation emails.");
    }

    if (request.status !== "Cancelled") {
      throw new Error("Cancellation emails can only be sent for cancelled requests.");
    }

    if (email.type === "request-cancelled-requestor") {
      return {
        ...email,
        to: [request.residentEmail]
      };
    }

    return {
      ...email,
      to: await getAdminRecipients(db)
    };
  }

  throw new Error(`Unsupported email type: ${email.type || "unknown"}`);
}

async function recordEmail(db, email, result, status, errorMessage = "") {
  await db.collection("mailQueue").add({
    ...email,
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
    const app = getAdminApp();
    const db = getFirestore(app);
    const token = getBearerToken(request);

    if (!token) {
      response.status(401).json({ error: "Missing Firebase auth token." });
      return;
    }

    const decodedToken = await getAuth(app).verifyIdToken(token);
    const body = await readJsonBody(request);
    const emails = Array.isArray(body.emails) ? body.emails : [];

    if (emails.length === 0) {
      response.status(400).json({ error: "No emails were provided." });
      return;
    }

    const results = [];
    const emailEnabled = await getEmailEnabled(db);

    for (const email of emails) {
      const authorizedEmails = await authorizeEmail({
        db,
        decodedToken,
        email
      });

      for (const authorizedEmail of Array.isArray(authorizedEmails)
        ? authorizedEmails
        : [authorizedEmails]) {
        try {
          if (!emailEnabled) {
            await recordEmail(db, authorizedEmail, null, "disabled");
            results.push({
              type: authorizedEmail.type,
              status: "disabled",
              resendId: ""
            });
            continue;
          }

          const result = await sendWithResend(authorizedEmail);
          const status = result.dryRun ? "dry-run" : "sent";

          await recordEmail(db, authorizedEmail, result, status);
          results.push({
            type: authorizedEmail.type,
            status,
            resendId: result.resendId || ""
          });
        } catch (error) {
          await recordEmail(
            db,
            authorizedEmail,
            null,
            "error",
            error.message || "Unknown email send error."
          );

          throw error;
        }
      }
    }

    response.status(200).json({ ok: true, results });
  } catch (error) {
    console.error("Email API error:", error);
    response.status(500).json({
      error: error.message || "Unable to send email."
    });
  }
}
