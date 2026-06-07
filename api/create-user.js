import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const SUPER_ADMIN_EMAILS = [
  "hurricanehearts.admin@gmail.com",
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
    "Firebase Admin credentials are not configured for the user create API."
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

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isSuperAdminEmail(email = "") {
  return SUPER_ADMIN_EMAILS.includes(normalizeEmail(email));
}

function isAdminProfile(profile, decodedToken) {
  return (
    profile?.role === "admin" ||
    isSuperAdminEmail(profile?.email) ||
    isSuperAdminEmail(decodedToken.email)
  );
}

function formatAddress(user) {
  return [
    [user.houseNumber, user.streetName].filter(Boolean).join(" "),
    user.arLotNumber ? `AR Lot ${user.arLotNumber}` : ""
  ]
    .filter(Boolean)
    .join(", ");
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

  let createdAuthUid = "";

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
      response.status(403).json({ error: "Only admins can add users." });
      return;
    }

    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "resident").trim();
    const approved = body.approved !== false;
    const active = body.active !== false;
    const targetIsSuperAdmin = isSuperAdminEmail(email);
    const requesterIsSuperAdmin =
      isSuperAdminEmail(adminProfile?.email) || isSuperAdminEmail(decodedToken.email);

    if (!name || !email) {
      response.status(400).json({ error: "Name and email are required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({
        error: "Temporary password must be at least 6 characters."
      });
      return;
    }

    if ((role === "admin" || targetIsSuperAdmin) && !requesterIsSuperAdmin) {
      response.status(403).json({
        error: "Only the Super Admin can create admin accounts."
      });
      return;
    }

    try {
      await auth.getUserByEmail(email);
      response.status(409).json({
        error: "A Firebase login already exists for this email."
      });
      return;
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    const authUser = await auth.createUser({
      email,
      password,
      displayName: name,
      disabled: !active
    });
    createdAuthUid = authUser.uid;

    const userProfile = {
      uid: authUser.uid,
      name,
      email,
      authEmail: email,
      hasEmail: true,
      houseNumber: String(body.houseNumber || "").trim(),
      streetName: String(body.streetName || "").trim(),
      arLotNumber: String(body.arLotNumber || "").trim(),
      phone: String(body.phone || "").trim(),
      serviceCategories: Array.isArray(body.serviceCategories)
        ? body.serviceCategories
        : [],
      dishVolunteerCategories:
        Array.isArray(body.serviceCategories) &&
        body.serviceCategories.includes("Donate a Dish") &&
        Array.isArray(body.dishVolunteerCategories)
        ? body.dishVolunteerCategories
        : [],
      mealPreparationLocation:
        requesterIsSuperAdmin && body.mealPreparationLocation === true,
      teamMember: requesterIsSuperAdmin ? body.teamMember === true : false,
      managedCategories:
        requesterIsSuperAdmin && body.teamMember === true && Array.isArray(body.managedCategories)
          ? body.managedCategories
          : [],
      role: targetIsSuperAdmin ? "admin" : role === "admin" ? "admin" : "resident",
      approved: targetIsSuperAdmin ? true : approved,
      active: targetIsSuperAdmin ? true : active,
      termsAccepted: false,
      termsAcceptedAt: null,
      termsVersion: "",
      firstLoginTermsRequired: true,
      profileComplete: true,
      manuallyCreated: true,
      createdAt: FieldValue.serverTimestamp(),
      createdByUid: decodedToken.uid,
      createdByEmail: decodedToken.email || adminProfile?.email || ""
    };

    userProfile.address = formatAddress(userProfile);

    await db.doc(`users/${authUser.uid}`).set(userProfile);

    response.status(200).json({
      ok: true,
      uid: authUser.uid,
      email,
      role: userProfile.role
    });
  } catch (error) {
    console.error("Create user API error:", error);

    if (createdAuthUid) {
      try {
        const auth = getAuth(getAdminApp());
        await auth.deleteUser(createdAuthUid);
      } catch (cleanupError) {
        console.error("Create user cleanup error:", cleanupError);
      }
    }

    response.status(500).json({
      error: error.message || "Unable to add user."
    });
  }
}
