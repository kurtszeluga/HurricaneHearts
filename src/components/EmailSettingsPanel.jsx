import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { PRIMARY_ADMIN_EMAIL } from "../utils/emailNotifications";

const EMAIL_SETTINGS_DOC = "emailSettings";
const ACTIVE_EVENT_DOC = "activeEvent";

function parseRecipients(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EmailSettingsPanel({ user }) {
  const [adminRecipients, setAdminRecipients] = useState(PRIMARY_ADMIN_EMAIL);
  const [draftRecipients, setDraftRecipients] = useState(PRIMARY_ADMIN_EMAIL);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });

  async function loadEmailSettings() {
    try {
      const settingsSnap = await getDoc(doc(db, "system", EMAIL_SETTINGS_DOC));
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};

      if (Array.isArray(settings.adminNotificationRecipients)) {
        return settings.adminNotificationRecipients;
      }
    } catch (error) {
      console.warn("Email settings primary load skipped:", error);
    }

    const activeEventSnap = await getDoc(doc(db, "system", ACTIVE_EVENT_DOC));
    const activeEvent = activeEventSnap.exists() ? activeEventSnap.data() : {};

    if (Array.isArray(activeEvent.emailSettings?.adminNotificationRecipients)) {
      return activeEvent.emailSettings.adminNotificationRecipients;
    }

    return [PRIMARY_ADMIN_EMAIL];
  }

  async function saveEmailSettings(recipients) {
    const payload = {
      adminNotificationRecipients: recipients,
      updatedAt: serverTimestamp(),
      updatedByEmail: user.email || "",
      updatedByUid: user.uid || ""
    };

    try {
      await setDoc(doc(db, "system", EMAIL_SETTINGS_DOC), payload, {
        merge: true
      });

      return "system/emailSettings";
    } catch (error) {
      console.warn("Email settings primary save skipped:", error);
    }

    await setDoc(
      doc(db, "system", ACTIVE_EVENT_DOC),
      {
        emailSettings: payload
      },
      { merge: true }
    );

    return "system/activeEvent";
  }

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const recipients = await loadEmailSettings();

        if (mounted) {
          const nextRecipients = recipients.join("\n");
          setAdminRecipients(nextRecipients);
          setDraftRecipients(nextRecipients);
          setStatus({ type: "", message: "" });
        }
      } catch (error) {
        console.error("Email settings load error:", error);
        if (mounted) {
          setStatus({
            type: "error",
            message: "Unable to load saved email settings."
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const saveSettings = async () => {
    const recipients = parseRecipients(draftRecipients);
    setStatus({ type: "", message: "" });

    if (recipients.length === 0) {
      setStatus({
        type: "error",
        message: "Please enter at least one admin recipient email address."
      });
      return;
    }

    try {
      setSaving(true);

      const savedPath = await saveEmailSettings(recipients);
      const nextRecipients = recipients.join("\n");

      setAdminRecipients(nextRecipients);
      setDraftRecipients(nextRecipients);
      setEditing(false);
      setStatus({
        type: "success",
        message: `Email settings saved to ${savedPath}.`
      });
    } catch (error) {
      console.error("Email settings save error:", error);
      setStatus({
        type: "error",
        message: "Unable to save email settings. Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setDraftRecipients(adminRecipients);
    setEditing(true);
    setStatus({ type: "", message: "" });
  };

  const cancelEditing = () => {
    setDraftRecipients(adminRecipients);
    setEditing(false);
    setStatus({ type: "", message: "" });
  };

  const displayedRecipients = parseRecipients(adminRecipients);

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172033] underline underline-offset-4">
            Email Settings
          </h2>
          <p className="text-sm text-[#667085] mt-2">
            Recipients for automatic app emails.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
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
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
          <label className="block text-sm font-semibold text-[#344054]">
            New user pending approval recipients
          </label>

          {editing ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={saveSettings}
                disabled={loading || saving}
                className="bg-[#b42318] hover:bg-[#9f1f16] disabled:bg-[#c7d0dc] text-white px-4 py-2 rounded-lg font-semibold"
              >
                {saving ? "Saving" : "Save"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="bg-white hover:bg-[#e2e8f0] disabled:bg-[#f1f5f9] border border-[#c7d0dc] text-[#475467] px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startEditing}
              disabled={loading}
              className="bg-white hover:bg-[#e2e8f0] disabled:bg-[#f1f5f9] border border-[#c7d0dc] text-[#475467] px-4 py-2 rounded-lg font-semibold"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              value={draftRecipients}
              onChange={(event) => setDraftRecipients(event.target.value)}
              rows={4}
              className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 text-sm text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#b42318]"
              placeholder={PRIMARY_ADMIN_EMAIL}
            />
            <p className="text-xs text-[#667085] mt-2">
              Enter one email per line, or separate multiple emails with commas.
            </p>
          </>
        ) : (
          <div className="border border-[#c7d0dc] rounded-lg bg-[#f8fafc] px-3 py-3 text-sm text-[#172033]">
            {loading ? (
              "Loading email settings..."
            ) : (
              <div className="flex flex-col gap-1">
                {displayedRecipients.map((recipient) => (
                  <span key={recipient}>{recipient}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
