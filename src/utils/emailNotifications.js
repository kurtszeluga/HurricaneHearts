import { auth } from "../firebase/config";
import { formatDateOnly } from "./formatDate";

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

function createEmail({
  to,
  subject,
  text,
  type,
  accessRequestUid,
  requestId,
  claimUid,
  eventId,
  eventName
}) {
  return {
    to,
    type,
    accessRequestUid,
    requestId,
    claimUid,
    eventId,
    eventName,
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

export async function queueRequestClaimedEmails(_db, { request, claim }) {
  const requestorName = request.residentName || "there";
  const claimantName = claim.name || claim.email || "A resident";
  const requestLabel = request.need || "your request";
  const peopleProvided = claim.peopleProvided || 1;
  const commentLine = claim.comment
    ? `Claim comment: ${claim.comment}`
    : "No claim comment was provided.";

  const requestorText = `Hi ${requestorName},

${claimantName} has claimed your Hurricane Hearts request.

Request: ${requestLabel}
People committed: ${peopleProvided}
${commentLine}

You can sign in to Hurricane Hearts to monitor the request.`;

  const claimantText = `Hi ${claimantName},

Thank you for claiming a Hurricane Hearts request.

Requestor: ${request.residentName || "Resident"}
Request: ${requestLabel}
People committed: ${peopleProvided}
${commentLine}

You can sign in to Hurricane Hearts to monitor or update the request.`;

  await sendEmailBatch([
    createEmail({
      to: request.residentEmail,
      subject: "Your Hurricane Hearts request was claimed",
      text: requestorText,
      type: "request-claimed-requestor",
      requestId: request.id,
      claimUid: claim.uid
    }),
    createEmail({
      to: claim.email,
      subject: "You claimed a Hurricane Hearts request",
      text: claimantText,
      type: "request-claimed-claimant",
      requestId: request.id,
      claimUid: claim.uid
    })
  ]);
}

export async function queueRequestCancelledEmails(_db, { request, cancelledBy, reason }) {
  const requestorText = `Hi ${request.residentName || "there"},

Your Hurricane Hearts request was cancelled.

Request: ${request.need || "Request"}
Cancelled by: ${cancelledBy.name || cancelledBy.email || "Hurricane Hearts"}
Reason: ${reason}

You can sign in to Hurricane Hearts to review your requests.`;

  const adminText = `A Hurricane Hearts request was cancelled.

Requestor: ${request.residentName || "Resident"}
Email: ${request.residentEmail || "Not provided"}
Request: ${request.need || "Request"}
Cancelled by: ${cancelledBy.name || cancelledBy.email || "User"}
Reason: ${reason}

Please sign in to Hurricane Hearts to review the request if needed.`;

  await sendEmailBatch([
    createEmail({
      to: request.residentEmail,
      subject: "Your Hurricane Hearts request was cancelled",
      text: requestorText,
      type: "request-cancelled-requestor",
      requestId: request.id
    }),
    createEmail({
      to: PRIMARY_ADMIN_EMAIL,
      subject: "Hurricane Hearts request cancelled",
      text: adminText,
      type: "request-cancelled-admin",
      requestId: request.id
    })
  ]);
}

export async function queueBlastEmail(_db, { subject, text, eventId = "", eventName = "" }) {
  await sendEmailBatch([
    createEmail({
      to: PRIMARY_ADMIN_EMAIL,
      subject,
      text,
      type: "admin-blast-active-users",
      eventId,
      eventName
    })
  ]);
}

export async function queueEventActivatedBlastEmail(db, { eventId, eventName, eventDate }) {
  const subject = `Hurricane Hearts event activated: ${eventName}`;
  const text = `A Hurricane Hearts event has been activated.

Event: ${eventName}
Date: ${formatDateOnly(eventDate)}

Hurricane Hearts is now open for requests related to this event. Please sign in if you need assistance or would like to monitor requests from neighbors.`;

  await queueBlastEmail(db, {
    subject,
    text,
    eventId,
    eventName
  });
}
