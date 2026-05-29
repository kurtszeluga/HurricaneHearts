import { auth } from "../firebase/config";

export const PRIMARY_ADMIN_EMAIL = "hurricanehearts.admin@gmail.com";
const DEFAULT_EMAIL_API_PATH = "/api/send-email";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text) {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function createEmail({ to, subject, text, type, accessRequestUid }) {
  return {
    to,
    type,
    accessRequestUid,
    message: {
      subject,
      text,
      html: textToHtml(text)
    }
  };
}

async function sendEmailBatch(emails) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("A signed-in user is required to send app emails.");
  }

  const token = await currentUser.getIdToken();
  const apiUrl =
    import.meta.env.VITE_EMAIL_API_URL || DEFAULT_EMAIL_API_PATH;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ emails })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || "Unable to send app email.");
  }

  return body;
}

export async function queueAccessRequestEmails(_db, profile) {
  const firstName = profile.name?.split(" ")[0] || "there";
  const welcomeText = `Hi ${firstName},

Welcome to Hurricane Hearts. Your access request has been received and is pending administrator approval.

After your account is approved, please sign in and review your profile. You will be asked to either select any assistance categories you would be willing to volunteer for, or simply check your contact information and save.

Thank you for being part of Hurricane Hearts.`;

  const adminText = `A new Hurricane Hearts user is pending approval.

Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone || "Not provided"}
Address: ${profile.address || "Not provided"}

Please sign in to the Admin Panel to approve or manage this account.`;

  await sendEmailBatch([
    createEmail({
      to: profile.email,
      subject: "Welcome to Hurricane Hearts",
      text: welcomeText,
      type: "access-request-welcome",
      accessRequestUid: profile.uid
    }),
    createEmail({
      to: PRIMARY_ADMIN_EMAIL,
      subject: "New Hurricane Hearts user pending approval",
      text: adminText,
      type: "admin-access-request",
      accessRequestUid: profile.uid
    })
  ]);
}

export async function queueApprovalEmail(_db, profile) {
  const firstName = profile.name?.split(" ")[0] || "there";
  const approvalText = `Hi ${firstName},

Good news. Your Hurricane Hearts account has been approved.

You can now sign in to Hurricane Hearts. The first time you sign in after approval, please review your profile and either select any assistance categories you would be willing to volunteer for, or confirm your contact information and save.

Thank you for being part of Hurricane Hearts.`;

  await sendEmailBatch([
    createEmail({
      to: profile.email,
      subject: "Your Hurricane Hearts account has been approved",
      text: approvalText,
      type: "account-approved",
      accessRequestUid: profile.uid || profile.id
    })
  ]);
}
