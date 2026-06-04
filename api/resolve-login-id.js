import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

  throw new Error(
    "Firebase Admin credentials are not configured for the login ID API."
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

function normalizeLoginId(value = "") {
  return String(value).trim().toLowerCase();
}

function isValidLoginId(value = "") {
  return /^[a-z0-9_-]{4,20}$/.test(normalizeLoginId(value));
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
    const loginIdKey = normalizeLoginId(body.loginId || "");

    if (!isValidLoginId(loginIdKey)) {
      response.status(400).json({ error: "Invalid login or password." });
      return;
    }

    const app = getAdminApp();
    const db = getFirestore(app);
    const snap = await db.doc(`loginIds/${loginIdKey}`).get();

    if (!snap.exists) {
      response.status(404).json({ error: "Invalid login or password." });
      return;
    }

    const loginRecord = snap.data() || {};

    response.status(200).json({
      email: loginRecord.authEmail || loginRecord.email || "",
      hasEmail: Boolean(loginRecord.email)
    });
  } catch (error) {
    console.error("Resolve login ID API error:", error);
    response.status(500).json({
      error: error.message || "Unable to resolve User ID."
    });
  }
}
