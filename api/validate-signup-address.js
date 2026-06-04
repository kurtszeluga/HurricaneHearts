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
    "Firebase Admin credentials are not configured for the address validation API."
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

function normalizeValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeLotNumber(value = "") {
  return normalizeValue(value).replace(/^ar\s*lot\s*/i, "");
}

function normalizeAddress(source = {}) {
  return {
    houseNumber: normalizeValue(source.houseNumber),
    streetName: normalizeValue(source.streetName),
    city: normalizeValue(source.city),
    zip: normalizeValue(source.zip),
    arLotNumber: normalizeLotNumber(source.arLotNumber)
  };
}

function findAddressMatch(source = {}, directory = []) {
  const target = normalizeAddress(source);

  return directory.find((entry) => {
    const current = normalizeAddress(entry);

    return (
      current.houseNumber === target.houseNumber &&
      current.streetName === target.streetName &&
      current.city === target.city &&
      current.zip === target.zip &&
      current.arLotNumber === target.arLotNumber
    );
  }) || null;
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
    const settingsSnap = await db.doc("system/signupSettings").get();
    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
    const directory = Array.isArray(settings.addressDirectory)
      ? settings.addressDirectory
      : [];

    if (settings.addressVerificationEnabled !== true) {
      response.status(200).json({
        configured: false,
        valid: true,
        directoryCount: directory.length
      });
      return;
    }

    if (directory.length === 0) {
      response.status(200).json({
        configured: false,
        valid: true,
        directoryCount: 0
      });
      return;
    }

    const body = await readJsonBody(request);
    const match = findAddressMatch(body, directory);

    response.status(200).json({
      configured: true,
      valid: Boolean(match),
      directoryCount: directory.length
    });
  } catch (error) {
    console.error("Validate signup address API error:", error);
    response.status(500).json({
      configured: false,
      valid: true,
      directoryCount: 0,
      error: error.message || "Unable to validate signup address."
    });
  }
}
