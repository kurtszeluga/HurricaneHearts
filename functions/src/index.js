import admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { buildResendPayload, sendQueuedEmail } from "./emailSender.js";

admin.initializeApp();

const db = admin.firestore();
const resendApiKey = defineSecret("RESEND_API_KEY");

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Hurricane Hearts <notifications@hurricanehearts.org>";

function shouldDryRun() {
  if (process.env.RESEND_DRY_RUN === "true") return true;
  if (process.env.RESEND_DRY_RUN === "false") return false;

  return process.env.FUNCTIONS_EMULATOR === "true";
}

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return [];
}

async function applyEmailSettings(email) {
  if (email.type !== "admin-access-request") {
    return email;
  }

  const settingsSnap = await db.doc("system/emailSettings").get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  let adminRecipients = normalizeRecipients(
    settings.adminNotificationRecipients
  );

  if (adminRecipients.length === 0) {
    const activeEventSnap = await db.doc("system/activeEvent").get();
    const activeEvent = activeEventSnap.exists ? activeEventSnap.data() : {};
    adminRecipients = normalizeRecipients(
      activeEvent.emailSettings?.adminNotificationRecipients
    );
  }

  if (adminRecipients.length === 0) {
    return email;
  }

  return {
    ...email,
    to: adminRecipients
  };
}

export const sendQueuedEmailWithResend = onDocumentCreated(
  {
    document: "mailQueue/{mailId}",
    secrets: [resendApiKey],
    region: "us-central1"
  },
  async (event) => {
    const snap = event.data;

    if (!snap) {
      return;
    }

    const ref = snap.ref;
    const email = snap.data();

    if (email.status && email.status !== "pending") {
      return;
    }

    await ref.set(
      {
        status: "processing",
        processingAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    try {
      const emailToSend = await applyEmailSettings(email);

      if (shouldDryRun()) {
        const dryRunPayload = buildResendPayload(emailToSend, RESEND_FROM_EMAIL);

        await ref.set(
          {
            status: "dry-run",
            dryRunPayload,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return;
      }

      const result = await sendQueuedEmail({
        email: emailToSend,
        apiKey: resendApiKey.value(),
        from: RESEND_FROM_EMAIL
      });

      await ref.set(
        {
          status: "sent",
          resendId: result.id || "",
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      await ref.set(
        {
          status: "error",
          errorMessage: error.message || "Unknown Resend send error.",
          erroredAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      throw error;
    }
  }
);
