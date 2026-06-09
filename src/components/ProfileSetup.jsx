import { useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import TermsAndConditions from "./TermsAndConditions";
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";
import { formatAddress, getAddressParts, isAddressComplete } from "../utils/addressFields";
import {
  dishVolunteerOptions,
  DONATE_A_DISH_CATEGORY,
  requestCategoryGroups
} from "../utils/requestCategories";
import { CURRENT_TERMS_VERSION } from "../utils/terms";

const BLOCK_MESSAGE_KEY = "hurricaneHeartsAuthMessage";
const AUTH_MODE_KEY = "hurricaneHeartsAuthMode";
export default function ProfileSetup({ user, onProfileSaved }) {
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsReviewed, setTermsReviewed] = useState(false);
  const [addressMismatchDialog, setAddressMismatchDialog] = useState(null);
  const addressMismatchResolverRef = useRef(null);
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    ...getAddressParts(user),
    phone: normalizePhoneNumber(user.phone),
    serviceCategories: user.serviceCategories || [],
    dishVolunteerCategories: user.dishVolunteerCategories || []
  });

  const askAddressMismatch = () => {
    return new Promise((resolve) => {
      addressMismatchResolverRef.current = resolve;
      setAddressMismatchDialog({
        note: "Address did not match directory."
      });
    });
  };

  const resolveAddressMismatch = (action) => {
    const note = addressMismatchDialog?.note || "";

    addressMismatchResolverRef.current?.({
      action,
      note
    });
    addressMismatchResolverRef.current = null;
    setAddressMismatchDialog(null);
  };

  const toggleServiceCategory = (category) => {
    setForm((current) => {
      const selected = current.serviceCategories.includes(category);

      return {
        ...current,
        serviceCategories: selected
          ? current.serviceCategories.filter((item) => item !== category)
          : [...current.serviceCategories, category],
        dishVolunteerCategories:
          selected && category === DONATE_A_DISH_CATEGORY
            ? []
            : current.dishVolunteerCategories
      };
    });
  };

  const toggleDishVolunteerCategory = (category) => {
    setForm((current) => {
      const selected = current.dishVolunteerCategories.includes(category);

      return {
        ...current,
        dishVolunteerCategories: selected
          ? current.dishVolunteerCategories.filter((item) => item !== category)
          : [...current.dishVolunteerCategories, category]
      };
    });
  };

  const validateSignupAddress = async () => {
    try {
      const response = await fetch("/api/validate-signup-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          houseNumber: form.houseNumber,
          streetName: form.streetName,
          arLotNumber: form.arLotNumber
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          configured: false,
          valid: true,
          directoryCount: 0
        };
      }

      return {
        configured: body.configured === true,
        valid: body.valid !== false,
        directoryCount: Number(body.directoryCount || 0)
      };
    } catch (error) {
      console.warn("Signup address validation skipped:", error);
      return {
        configured: false,
        valid: true,
        directoryCount: 0
      };
    }
  };

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim() || !isAddressComplete(form) || !form.phone.trim()) {
      alert("Please complete name, email, house number, street name, AR lot number, and phone.");
      return;
    }

    if (!termsReviewed || !acceptedTerms) {
      alert("Please open the Terms and Conditions, scroll to the bottom, and accept them before submitting your access request.");
      return;
    }

    const addressValidation = await validateSignupAddress();
    const addressVerificationEnabled = addressValidation.configured;
    let addressVerificationOverride = false;
    let addressVerificationOverrideNote = "";

    if (addressValidation.configured && !addressValidation.valid) {
      const mismatchDecision = await askAddressMismatch();

      if (mismatchDecision.action === "cancel") {
        onProfileSaved(null);
        await signOut(auth);
        return;
      }

      if (mismatchDecision.action !== "submit") {
        return;
      }

      addressVerificationOverride = true;
      addressVerificationOverrideNote = mismatchDecision.note || "";
    }

    const updatedProfile = {
      ...user,
      ...form,
      houseNumber: form.houseNumber.trim(),
      streetName: form.streetName.trim(),
      arLotNumber: form.arLotNumber.trim(),
      address: formatAddress(form),
      addressVerified:
        addressVerificationEnabled &&
        addressValidation.configured &&
        addressValidation.valid,
      addressVerificationRequired: addressVerificationEnabled,
      addressVerificationOverride,
      addressVerificationOverrideNote: addressVerificationOverrideNote.trim(),
      phone: normalizePhoneNumber(form.phone),
      role: user.role || "resident",
      approved: false,
      active: true,
      profileComplete: true,
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: CURRENT_TERMS_VERSION
    };

    await setDoc(doc(db, "users", user.uid), updatedProfile, { merge: true });

    sessionStorage.setItem(
      BLOCK_MESSAGE_KEY,
      "Your access request has been submitted and is pending admin approval. Please contact the Hurricane Hearts administrator if you need access sooner."
    );
    sessionStorage.setItem(AUTH_MODE_KEY, "login");

    onProfileSaved(null);
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-[#e8edf3] flex items-center justify-center p-6">
      <div className="bg-white border border-[#c7d0dc] rounded-xl shadow-lg p-8 max-w-xl w-full">
        <h1 className="text-3xl font-bold text-[#172033] mb-2">Request Access</h1>
        <p className="text-[#667085] mb-6">
          Please complete your profile. An administrator will review and approve your account.
        </p>

        <div className="grid gap-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="border border-[#c7d0dc] rounded-lg p-3.5"
          />

          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="border border-[#c7d0dc] rounded-lg p-3.5"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.houseNumber}
              onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
              placeholder="House number"
              className="border border-[#c7d0dc] rounded-lg p-3.5"
            />

            <input
              value={form.streetName}
              onChange={(e) => setForm({ ...form, streetName: e.target.value })}
              placeholder="Street name"
              className="border border-[#c7d0dc] rounded-lg p-3.5"
            />

            <input
              value={form.arLotNumber}
              onChange={(e) => setForm({ ...form, arLotNumber: e.target.value })}
              placeholder="AR Lot number"
              className="border border-[#c7d0dc] rounded-lg p-3.5 md:col-span-2"
            />
          </div>

          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
            placeholder="Phone number"
            className="border border-[#c7d0dc] rounded-lg p-3.5"
          />
        </div>

        <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4 mt-5">
          <div className="font-semibold mb-2">Willing to Help With</div>
          <p className="text-sm text-[#667085] mb-3">
            Select any request categories you would be willing to support as a helper.
          </p>

          <div className="space-y-4">
            {requestCategoryGroups.map((group) => (
              <div key={group.label}>
                <div className="text-xs font-bold uppercase text-[#667085] mb-2">
                  {group.label}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {group.categories.map((category) => {
                    const selected = form.serviceCategories.includes(category);

                    return (
                      <label
                        key={category}
                        className={
                          selected
                            ? "border border-[#fecdca] bg-[#fff1f0] rounded-lg p-3 flex items-center gap-2 font-semibold"
                            : "border border-[#c7d0dc] rounded-lg p-3 flex items-center gap-2 bg-white"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleServiceCategory(category)}
                        />
                        {category}
                      </label>
                    );
                  })}
                </div>

                {group.categories.includes(DONATE_A_DISH_CATEGORY) &&
                  form.serviceCategories.includes(DONATE_A_DISH_CATEGORY) && (
                    <div className="mt-3 grid gap-2 pl-3">
                      {dishVolunteerOptions.map((option) => (
                        <label
                          key={option.value}
                          className="rounded-lg border border-[#c7d0dc] bg-white p-3 text-sm"
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <input
                              type="checkbox"
                              checked={form.dishVolunteerCategories.includes(option.value)}
                              onChange={() => toggleDishVolunteerCategory(option.value)}
                            />
                            {option.value}
                          </span>
                          <span className="mt-1 block text-xs font-normal leading-snug text-[#667085]">
                            {option.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4 mt-5">
          <div className="font-semibold mb-2">Terms and Conditions</div>
          <p className="text-sm text-[#667085] mb-3">
            You must review and accept the Hurricane Hearts Terms and Conditions before requesting access.
          </p>

          <button
            onClick={() => setShowTerms(true)}
            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] px-4 py-2 rounded-lg font-semibold mr-3"
          >
            View Terms
          </button>

          <label className="inline-flex items-center gap-2 text-sm font-semibold mt-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              disabled={!termsReviewed}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            I have read and accept the Terms and Conditions.
          </label>
          {!termsReviewed && (
            <p className="mt-2 text-xs font-semibold text-[#667085]">
              Open the terms and scroll to the bottom before accepting.
            </p>
          )}
        </div>

        <button
          onClick={saveProfile}
          className="w-full mt-6 bg-[#b42318] hover:bg-[#9f1f16] text-white py-3 rounded-lg font-semibold"
        >
          Submit Access Request
        </button>
      </div>

      {showTerms && (
        <TermsAndConditions
          onClose={() => setShowTerms(false)}
          onReviewComplete={() => setTermsReviewed(true)}
        />
      )}

      {addressMismatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[#172033]">
              Address Not Found
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#475467]">
              The house number and AR lot number did not match the community address directory. Street name is required for requests and volunteer coordination, but is not used for this verification check.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#475467]">
              You can edit the form, cancel this request, or submit it anyway for admin review.
            </p>

            <label className="mt-4 block text-sm font-semibold text-[#172033]">
              Optional note for admin review
              <textarea
                value={addressMismatchDialog.note}
                onChange={(event) =>
                  setAddressMismatchDialog({
                    ...addressMismatchDialog,
                    note: event.target.value
                  })
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-[#c7d0dc] p-3 text-sm font-normal text-[#172033]"
              />
            </label>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => resolveAddressMismatch("edit")}
                className="rounded-md border border-[#c7d0dc] bg-white px-4 py-2 text-sm font-semibold text-[#475467] hover:bg-[#f1f5f9]"
              >
                Edit Form
              </button>
              <button
                type="button"
                onClick={() => resolveAddressMismatch("cancel")}
                className="rounded-md border border-[#fecdca] bg-[#fff1f0] px-4 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fee4e2]"
              >
                Cancel Request
              </button>
              <button
                type="button"
                onClick={() => resolveAddressMismatch("submit")}
                className="rounded-md bg-[#b42318] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f1f16]"
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
