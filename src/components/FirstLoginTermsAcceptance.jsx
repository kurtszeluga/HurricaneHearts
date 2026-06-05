import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import TermsAndConditions from "./TermsAndConditions";
import { CURRENT_TERMS_VERSION } from "../utils/terms";

export default function FirstLoginTermsAcceptance({ user, onAccepted }) {
  const [showTerms, setShowTerms] = useState(false);
  const [termsReviewed, setTermsReviewed] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const acceptTerms = async () => {
    if (!termsReviewed || !acceptedTerms) {
      alert("Please open the Terms and Conditions, scroll to the bottom, and accept them.");
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
        termsVersion: CURRENT_TERMS_VERSION,
        firstLoginTermsRequired: false
      });

      onAccepted({
        ...user,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: CURRENT_TERMS_VERSION,
        firstLoginTermsRequired: false,
        termsReviewRequired: false
      });
    } catch (error) {
      console.error("Terms acceptance error:", error);
      alert("Unable to save your acceptance. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8edf3] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-lg border border-[#c7d0dc] bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-[#172033]">
          Review Terms and Conditions
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#475467]">
          Before continuing into Hurricane Hearts, you must personally review and
          accept the current Terms and Conditions.
        </p>

        <button
          type="button"
          onClick={() => setShowTerms(true)}
          disabled={saving}
          className="mt-5 rounded-md border border-[#c7d0dc] bg-white px-4 py-2 font-semibold text-[#172033] hover:bg-[#f1f5f9]"
        >
          Open Terms and Conditions
        </button>

        <label className="mt-5 flex items-start gap-2 text-sm font-semibold text-[#172033]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            disabled={!termsReviewed || saving}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1"
          />
          I have read and accept the Terms and Conditions.
        </label>

        {!termsReviewed && (
          <p className="mt-2 text-xs font-semibold text-[#667085]">
            Open the terms and scroll to the bottom before accepting.
          </p>
        )}

        <button
          type="button"
          onClick={acceptTerms}
          disabled={!termsReviewed || !acceptedTerms || saving}
          className={
            termsReviewed && acceptedTerms && !saving
              ? "mt-6 w-full rounded-md bg-[#b42318] px-4 py-3 font-semibold text-white hover:bg-[#9f1f16]"
              : "mt-6 w-full cursor-not-allowed rounded-md bg-[#e2e8f0] px-4 py-3 font-semibold text-[#98a2b3]"
          }
        >
          {saving ? "Saving Acceptance..." : "Accept and Continue"}
        </button>
      </div>

      {showTerms && (
        <TermsAndConditions
          onClose={() => setShowTerms(false)}
          onReviewComplete={() => setTermsReviewed(true)}
        />
      )}
    </div>
  );
}
