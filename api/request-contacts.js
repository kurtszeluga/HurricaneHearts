import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.EMAIL_API_ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      };

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
  });
}

function getBearerToken(request) {
  return (request.headers.authorization || "").match(/^Bearer (.+)$/i)?.[1] || "";
}

function contactProfile(snap) {
  const profile = snap.data() || {};

  return {
    uid: snap.id,
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    houseNumber: profile.houseNumber || "",
    streetName: profile.streetName || "",
    city: profile.city || "",
    zip: profile.zip || "",
    arLotNumber: profile.arLotNumber || "",
    address: profile.address || ""
  };
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed." });

  try {
    const app = getAdminApp();
    const decodedToken = await getAuth(app).verifyIdToken(getBearerToken(request));
    const db = getFirestore(app);
    const requestId = String(request.query?.requestId || "").trim();

    if (!requestId) return response.status(400).json({ error: "Request ID is required." });

    const [viewerSnap, assistanceSnap] = await Promise.all([
      db.doc(`users/${decodedToken.uid}`).get(),
      db.doc(`requests/${requestId}`).get()
    ]);
    const viewer = viewerSnap.data() || {};
    const assistanceRequest = assistanceSnap.data() || {};
    const claimantUids = assistanceRequest.claimantUids || [];
    const isTeam = viewer.teamMember === true;
    const isRequestor = assistanceRequest.residentUid === decodedToken.uid;
    const isClaimant = claimantUids.includes(decodedToken.uid);

    if (
      !viewerSnap.exists ||
      !assistanceSnap.exists ||
      viewer.active !== true ||
      viewer.approved !== true ||
      viewer.termsAccepted !== true ||
      viewer.termsVersion !== "1.0" ||
      (!isTeam && !isRequestor && !isClaimant)
    ) {
      return response.status(403).json({ error: "Contact information is not available." });
    }

    const allowedUids = isTeam || isRequestor
      ? [assistanceRequest.residentUid, ...claimantUids]
      : [assistanceRequest.residentUid, decodedToken.uid];
    const uniqueUids = [...new Set(allowedUids.filter(Boolean))];
    const contacts = await Promise.all(
      uniqueUids.map((uid) => db.doc(`users/${uid}`).get())
    );

    response.status(200).json({
      requestorUid: assistanceRequest.residentUid || "",
      contacts: contacts.filter((snap) => snap.exists).map(contactProfile)
    });
  } catch (error) {
    console.error("Request contacts API error:", error);
    response.status(401).json({ error: "Unable to load request contact information." });
  }
}
