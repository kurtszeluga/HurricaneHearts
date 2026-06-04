import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PRIMARY_ADMIN_EMAIL = "hurricanehearts.admin@gmail.com";

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
    "Firebase Admin credentials are not configured for the login ID update API."
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
    profile?.email === PRIMARY_ADMIN_EMAIL ||
    decodedToken.email === PRIMARY_ADMIN_EMAIL
  );
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
        error: "Only the primary owner can change User IDs."
      });
      return;
    }

    const body = await readJsonBody(request);
    const userId = String(body.userId || "").trim();
    const loginId = String(body.loginId || "").trim();
    const loginIdKey = normalizeLoginId(loginId);

    if (!userId) {
      response.status(400).json({ error: "Missing user id." });
      return;
    }

    if (!isValidLoginId(loginId)) {
      response.status(400).json({
        error: "User ID must be 4-20 characters using letters, numbers, dashes, or underscores."
      });
      return;
    }

    const targetProfile = await getUserProfile(db, userId);

    if (!targetProfile) {
      response.status(404).json({ error: "User profile was not found." });
      return;
    }

    const existingLoginSnap = await db.doc(`loginIds/${loginIdKey}`).get();

    if (existingLoginSnap.exists) {
      const existingLogin = existingLoginSnap.data() || {};

      if (existingLogin.uid !== userId) {
        response.status(409).json({
          error: "That User ID is already taken. Please choose another one."
        });
        return;
      }
    }

    const oldLoginIdKey = targetProfile.loginIdKey || "";
    const authEmail = targetProfile.authEmail || targetProfile.email || "";
    const batch = db.batch();

    batch.set(
      db.doc(`loginIds/${loginIdKey}`),
      {
        uid: userId,
        loginId,
        loginIdKey,
        email: targetProfile.email || "",
        authEmail,
        active: targetProfile.active !== false,
        updatedAt: FieldValue.serverTimestamp(),
        updatedByUid: decodedToken.uid,
        updatedByEmail: decodedToken.email || PRIMARY_ADMIN_EMAIL
      },
      { merge: true }
    );

    if (oldLoginIdKey && oldLoginIdKey !== loginIdKey) {
      batch.delete(db.doc(`loginIds/${oldLoginIdKey}`));
    }

    batch.set(
      db.doc(`users/${userId}`),
      {
        loginId,
        loginIdKey,
        loginIdUpdatedAt: FieldValue.serverTimestamp(),
        loginIdUpdatedByUid: decodedToken.uid,
        loginIdUpdatedByEmail: decodedToken.email || PRIMARY_ADMIN_EMAIL
      },
      { merge: true }
    );

    await batch.commit();

    response.status(200).json({ ok: true, loginId, loginIdKey });
  } catch (error) {
    console.error("Update login ID API error:", error);
    response.status(500).json({
      error: error.message || "Unable to update User ID."
    });
  }
}
