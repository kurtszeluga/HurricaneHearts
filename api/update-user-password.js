import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PRIMARY_ADMIN_EMAIL = "hurricanehearts.admin@gmail.com";
const SUPER_ADMIN_EMAILS = [
  PRIMARY_ADMIN_EMAIL,
  "kurtszeluga@gmail.com"
];

function setCorsHeaders(response) {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.EMAIL_API_ALLOWED_ORIGIN || "*"
  );
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
    "Firebase Admin credentials are not configured for the password update API."
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

async function getUserProfile(db, uid) {
  const snap = await db.doc(`users/${uid}`).get();

  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

function isPrimaryOwner(profile, decodedToken) {
  return (
    SUPER_ADMIN_EMAILS.includes(String(profile?.email || "").trim().toLowerCase()) ||
    SUPER_ADMIN_EMAILS.includes(String(decodedToken.email || "").trim().toLowerCase())
  );
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
    const auth = getAuth(app);
    const db = getFirestore(app);
    const token = getBearerToken(request);

    if (!token) {
      response.status(401).json({ error: "Missing Firebase auth token." });
      return;
    }

    const decodedToken = await auth.verifyIdToken(token);
    const adminProfile = await getUserProfile(db, decodedToken.uid);

    if (!isPrimaryOwner(adminProfile, decodedToken)) {
      response.status(403).json({
        error: "Only the Super Admin can change user passwords."
      });
      return;
    }

    const body = await readJsonBody(request);
    const userId = String(body.userId || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!userId) {
      response.status(400).json({ error: "Missing user id." });
      return;
    }

    if (newPassword.length < 6) {
      response.status(400).json({
        error: "Password must be at least 6 characters."
      });
      return;
    }

    const targetProfile = await getUserProfile(db, userId);

    if (!targetProfile) {
      response.status(404).json({ error: "User profile was not found." });
      return;
    }

    const authUid = targetProfile.uid || targetProfile.id;

    await auth.updateUser(authUid, {
      password: newPassword
    });

    await db.doc(`users/${userId}`).set(
      {
        passwordUpdatedAt: FieldValue.serverTimestamp(),
        passwordUpdatedByUid: decodedToken.uid,
        passwordUpdatedByEmail: decodedToken.email || PRIMARY_ADMIN_EMAIL
      },
      { merge: true }
    );

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Update user password API error:", error);
    response.status(500).json({
      error: error.message || "Unable to update user password."
    });
  }
}
