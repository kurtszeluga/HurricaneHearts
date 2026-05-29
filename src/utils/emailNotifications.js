import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export const PRIMARY_ADMIN_EMAIL = "hurricanehearts.admin@gmail.com";

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

async function queueEmail(db, { to, subject, text, type, accessRequestUid }) {
  await addDoc(collection(db, "mailQueue"), {
    to,
    type,
    accessRequestUid,
    status: "pending",
    createdAt: serverTimestamp(),
    message: {
      subject,
      text,
      html: textToHtml(text)
    }
  });
}

export async function queueAccessRequestEmails(db, profile) {
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

  await Promise.all([
    queueEmail(db, {
      to: profile.email,
      subject: "Welcome to Hurricane Hearts",
      text: welcomeText,
      type: "access-request-welcome",
      accessRequestUid: profile.uid
    }),
    queueEmail(db, {
      to: PRIMARY_ADMIN_EMAIL,
      subject: "New Hurricane Hearts user pending approval",
      text: adminText,
      type: "admin-access-request",
      accessRequestUid: profile.uid
    })
  ]);
}

export async function queueApprovalEmail(db, profile) {
  const firstName = profile.name?.split(" ")[0] || "there";
  const approvalText = `Hi ${firstName},

Good news. Your Hurricane Hearts account has been approved.

You can now sign in to Hurricane Hearts. The first time you sign in after approval, please review your profile and either select any assistance categories you would be willing to volunteer for, or confirm your contact information and save.

Thank you for being part of Hurricane Hearts.`;

  await queueEmail(db, {
    to: profile.email,
    subject: "Your Hurricane Hearts account has been approved",
    text: approvalText,
    type: "account-approved",
    accessRequestUid: profile.uid || profile.id
  });
}
