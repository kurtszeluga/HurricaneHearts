import fs from "node:fs";
import path from "node:path";
import { sendQueuedEmail } from "../src/emailSender.js";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/))
      .filter(Boolean)
      .map((match) => {
        let value = match[2].trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        return [match[1], value];
      })
  );
}

const functionsDir = path.resolve(import.meta.dirname, "..");
const localEnv = parseEnvFile(path.join(functionsDir, ".env.local"));
const secretEnv = parseEnvFile(path.join(functionsDir, ".secret.local"));
const env = {
  ...localEnv,
  ...secretEnv,
  ...process.env
};

if (env.CONFIRM_SEND_REAL_EMAIL !== "true") {
  throw new Error(
    "Set CONFIRM_SEND_REAL_EMAIL=true to send a real Resend test email."
  );
}

const to = env.TEST_EMAIL_TO;
const from =
  env.TEST_EMAIL_FROM || env.RESEND_FROM_EMAIL || "Hurricane Hearts <notifications@hurricanehearts.org>";
const apiKey = env.RESEND_API_KEY;

if (!to) {
  throw new Error("Set TEST_EMAIL_TO to the recipient email address.");
}

const email = {
  to,
  message: {
    subject: "Hurricane Hearts email test",
    text: "This is a real Resend test email from the Hurricane Hearts local development environment.",
    html: "<p>This is a real Resend test email from the Hurricane Hearts local development environment.</p>"
  }
};

const result = await sendQueuedEmail({
  email,
  apiKey,
  from
});

console.log(
  JSON.stringify(
    {
      sent: true,
      to,
      from,
      resendId: result.id || null
    },
    null,
    2
  )
);
