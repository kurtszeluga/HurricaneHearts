import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
    "Firebase Admin credentials are not configured for the user delete API."
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

function isAdminProfile(profile, decodedToken) {
  return (
    profile?.role === "admin" ||
    profile?.email === PRIMARY_ADMIN_EMAIL ||
    decodedToken.email === PRIMARY_ADMIN_EMAIL
  );
}

async function deleteAuthUser(auth, uid) {
  try {
    await auth.deleteUser(uid);

    return true;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return false;
    }

    throw error;
  }
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

    if (!isAdminProfile(adminProfile, decodedToken)) {
      response.status(403).json({ error: "Only admins can delete users." });
      return;
    }

    const body = await readJsonBody(request);
    const userId = String(body.userId || "").trim();

    if (!userId) {
      response.status(400).json({ error: "Missing user id." });
      return;
    }

    if (userId === decodedToken.uid) {
      response.status(400).json({
        error: "You cannot delete your own account from inside the app."
      });
      return;
    }

    const targetProfile = await getUserProfile(db, userId);

    if (!targetProfile) {
      response.status(404).json({ error: "User profile was not found." });
      return;
    }

    if (targetProfile.email === PRIMARY_ADMIN_EMAIL) {
      response.status(400).json({
        error: "The primary owner account cannot be deleted."
      });
      return;
    }

    const authUid = targetProfile.uid || targetProfile.id;
    const authDeleted = authUid ? await deleteAuthUser(auth, authUid) : false;

    await db.doc(`users/${userId}`).delete();

    response.status(200).json({
      ok: true,
      authDeleted,
      profileDeleted: true
    });
  } catch (error) {
    console.error("Delete user API error:", error);
    response.status(500).json({
      error: error.message || "Unable to delete user."
    });
  }
}
