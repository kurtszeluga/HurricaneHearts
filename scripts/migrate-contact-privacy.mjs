import fs from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return JSON.parse(
      fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
    );
  }

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

function sanitizeClaims(claims = []) {
  return claims.map((claim) => {
    const safeClaim = { ...claim };
    delete safeClaim.email;
    delete safeClaim.phone;
    return safeClaim;
  });
}

const confirmMigration =
  process.env.CONFIRM_CONTACT_PRIVACY_MIGRATION === "true";
const serviceAccount = loadServiceAccount();
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});
const db = getFirestore(app);
const [requestsSnap, historySnap] = await Promise.all([
  db.collection("requests").get(),
  db.collection("requestHistory").get()
]);

const requestsToClean = requestsSnap.docs.filter((doc) => {
  const data = doc.data();
  return (
    data.residentEmail !== undefined ||
    data.residentPhone !== undefined ||
    data.residentAddress !== undefined ||
    data.assignedHelperEmail !== undefined ||
    data.assignedHelperPhone !== undefined ||
    (data.claimCommitments || []).some(
      (claim) => claim.email !== undefined || claim.phone !== undefined
    )
  );
});
const historyToClean = historySnap.docs.filter(
  (doc) => doc.data().byEmail !== undefined
);

console.log(
  JSON.stringify(
    {
      mode: confirmMigration ? "LIVE" : "DRY RUN",
      requestsToClean: requestsToClean.length,
      historyToClean: historyToClean.length
    },
    null,
    2
  )
);

if (!confirmMigration) {
  console.log(
    "No records changed. Set CONFIRM_CONTACT_PRIVACY_MIGRATION=true to apply."
  );
  process.exit(0);
}

const writer = db.bulkWriter();

for (const requestDoc of requestsToClean) {
  writer.update(requestDoc.ref, {
    residentEmail: FieldValue.delete(),
    residentPhone: FieldValue.delete(),
    residentAddress: FieldValue.delete(),
    assignedHelperEmail: FieldValue.delete(),
    assignedHelperPhone: FieldValue.delete(),
    claimCommitments: sanitizeClaims(requestDoc.data().claimCommitments)
  });
}

for (const historyDoc of historyToClean) {
  writer.update(historyDoc.ref, {
    byEmail: FieldValue.delete()
  });
}

await writer.close();
console.log("Contact privacy migration completed.");
