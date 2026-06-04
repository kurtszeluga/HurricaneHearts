import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const PRIMARY_OWNER_EMAIL = "hurricanehearts.admin@gmail.com";

export default function SignupSettingsPanel({ user }) {
  const isPrimaryOwner = user.email === PRIMARY_OWNER_EMAIL;
  const [addressVerificationEnabled, setAddressVerificationEnabled] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, "system", "signupSettings"));
        const settings = snap.exists() ? snap.data() || {} : {};

        if (mounted) {
          setAddressVerificationEnabled(
            settings.addressVerificationEnabled === true
          );
        }
      } catch (error) {
        console.error("Signup settings load error:", error);
        if (mounted) {
          setStatus("Unable to load signup settings.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (isPrimaryOwner) {
      loadSettings();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [isPrimaryOwner]);

  if (!isPrimaryOwner) return null;

  const toggleAddressVerification = async () => {
    const nextEnabled = !addressVerificationEnabled;

    setSaving(true);
    setStatus("");
    setAddressVerificationEnabled(nextEnabled);

    try {
      await setDoc(
        doc(db, "system", "signupSettings"),
        {
          addressVerificationEnabled: nextEnabled,
          updatedAt: serverTimestamp(),
          updatedByEmail: user.email || "",
          updatedByUid: user.uid || ""
        },
        { merge: true }
      );

      setStatus(
        nextEnabled
          ? "Address/lot verification enabled for signup."
          : "Address/lot verification disabled for signup."
      );
    } catch (error) {
      console.error("Signup settings save error:", error);
      setAddressVerificationEnabled(!nextEnabled);
      setStatus("Unable to save signup setting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#172033]">
            Signup Settings
          </h2>
          <p className="text-sm text-[#667085] mt-1">
            Control whether request access checks the community address and AR lot directory.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAddressVerification}
          disabled={loading || saving}
          className={
            addressVerificationEnabled
              ? "rounded-lg bg-[#b42318] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f1f16] disabled:bg-[#98a2b3]"
              : "rounded-lg bg-[#1f3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172b46] disabled:bg-[#98a2b3]"
          }
        >
          {saving
            ? "Saving..."
            : addressVerificationEnabled
              ? "Turn Off Verification"
              : "Turn On Verification"}
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-[#c7d0dc] bg-[#f8fafc] px-3 py-2 text-sm text-[#475467]">
        Current status:{" "}
        <span
          className={
            addressVerificationEnabled
              ? "font-bold text-[#b42318]"
              : "font-bold text-[#067647]"
          }
        >
          {loading
            ? "Loading..."
            : addressVerificationEnabled
              ? "Verification ON"
              : "Verification OFF"}
        </span>
      </div>

      {status && (
        <div className="mt-3 text-sm font-semibold text-[#475467]">
          {status}
        </div>
      )}
    </div>
  );
}
