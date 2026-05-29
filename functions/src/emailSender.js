const RESEND_SEND_URL = "https://api.resend.com/emails";

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function validateQueuedEmail(email) {
  const to = normalizeRecipients(email.to);
  const subject = email.message?.subject?.trim();
  const text = email.message?.text?.trim();
  const html = email.message?.html?.trim();

  if (to.length === 0) {
    throw new Error("Email queue item is missing a recipient.");
  }

  if (!subject) {
    throw new Error("Email queue item is missing a subject.");
  }

  if (!text && !html) {
    throw new Error("Email queue item is missing message text/html.");
  }

  return {
    to,
    subject,
    text,
    html
  };
}

export function buildResendPayload(email, from) {
  const valid = validateQueuedEmail(email);

  return {
    from,
    to: valid.to,
    subject: valid.subject,
    text: valid.text,
    html: valid.html
  };
}

export async function sendQueuedEmail({ email, apiKey, from }) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  const payload = buildResendPayload(email, from);

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.message || `Resend email send failed with HTTP ${response.status}.`
    );
  }

  return body;
}
