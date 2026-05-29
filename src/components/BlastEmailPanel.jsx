import { useState } from "react";
import { db } from "../firebase/config";
import { queueBlastEmail } from "../utils/emailNotifications";

const emptyBlast = {
  subject: "",
  message: ""
};

export default function BlastEmailPanel() {
  const [blast, setBlast] = useState(emptyBlast);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });

  const updateBlast = (field, value) => {
    setBlast((current) => ({
      ...current,
      [field]: value
    }));
  };

  const sendBlast = async () => {
    const subject = blast.subject.trim();
    const message = blast.message.trim();

    setStatus({ type: "", message: "" });

    if (!subject || !message) {
      setStatus({
        type: "error",
        message: "Please enter a subject and message."
      });
      return;
    }

    const confirmed = window.confirm(
      "Send this blast email to all active approved users?"
    );

    if (!confirmed) return;

    try {
      setSending(true);

      await queueBlastEmail(db, {
        subject,
        text: message
      });

      setBlast(emptyBlast);
      setStatus({
        type: "success",
        message: "Blast email queued for active users."
      });
    } catch (error) {
      console.error("Blast email error:", error);
      setStatus({
        type: "error",
        message: error.message || "Unable to send blast email."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172033] underline underline-offset-4">
            Blast Email
          </h2>
          <p className="text-sm text-[#667085] mt-2">
            Send a one-time email to all active approved users.
          </p>
        </div>

        {status.message && (
          <div
            className={
              status.type === "success"
                ? "rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-3 py-2 text-sm font-semibold text-[#067647]"
                : "rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-semibold text-[#b42318]"
            }
            role="status"
            aria-live="polite"
          >
            {status.message}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <input
          value={blast.subject}
          onChange={(event) => updateBlast("subject", event.target.value)}
          className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 text-sm text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#b42318]"
          placeholder="Subject"
        />

        <textarea
          value={blast.message}
          onChange={(event) => updateBlast("message", event.target.value)}
          rows={6}
          className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 text-sm text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#b42318]"
          placeholder="Message"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={sendBlast}
            disabled={sending}
            className="bg-[#b42318] hover:bg-[#9f1f16] disabled:bg-[#c7d0dc] text-white px-4 py-2 rounded-lg font-semibold"
          >
            {sending ? "Sending" : "Send Blast"}
          </button>
        </div>
      </div>
    </div>
  );
}
