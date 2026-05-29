import { buildResendPayload } from "../src/emailSender.js";

const sampleEmail = {
  to: "resident@example.com",
  type: "access-request-welcome",
  accessRequestUid: "sample-uid",
  status: "pending",
  message: {
    subject: "Welcome to Hurricane Hearts",
    text: "Hi there,\n\nYour access request has been received.",
    html: "<p>Hi there,</p><p>Your access request has been received.</p>"
  }
};

const payload = buildResendPayload(
  sampleEmail,
  "Hurricane Hearts <notifications@example.com>"
);

console.log(JSON.stringify(payload, null, 2));
