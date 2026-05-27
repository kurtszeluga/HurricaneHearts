import { useState } from "react";
import { signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import TermsAndConditions from "./TermsAndConditions";
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";

const BLOCK_MESSAGE_KEY = "hurricaneHeartsAuthMessage";
const AUTH_MODE_KEY = "hurricaneHeartsAuthMode";
const TERMS_VERSION = "1.0";

const requestCategories = [
  "Wellness Check",
  "Transportation",
  "Food-Water",
  "Adopt A Buddy",
  "Storm Prep",
  "Storm Cleanup",
  "Power-Generator Help",
  "Pet Assistance",
  "Borrow Supplies",
  "Other"
];

export default function ProfileSetup({ user, onProfileSaved }) {
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    address: user.address || "",
    phone: normalizePhoneNumber(user.phone),
    serviceCategories: user.serviceCategories || []
  });

  const toggleServiceCategory = (category) => {
    setForm((current) => {
      const selected = current.serviceCategories.includes(category);

      return {
        ...current,
        serviceCategories: selected
          ? current.serviceCategories.filter((item) => item !== category)
          : [...current.serviceCategories, category]
      };
    });
  };

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.address.trim() || !form.phone.trim()) {
      alert("Please complete name, email, address, and phone.");
      return;
    }

    if (!acceptedTerms) {
      alert("Please review and accept the Terms and Conditions before submitting your access request.");
      return;
    }

    const updatedProfile = {
      ...user,
      ...form,
      phone: normalizePhoneNumber(form.phone),
      role: user.role || "resident",
      approved: false,
      active: true,
      profileComplete: true,
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: TERMS_VERSION
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl w-full">
        <h1 className="text-3xl font-bold mb-2">Request Access</h1>
        <p className="text-gray-500 mb-6">
          Please complete your profile. An administrator will review and approve your account.
        </p>

        <div className="grid gap-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="border rounded-2xl p-4"
          />

          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="border rounded-2xl p-4"
          />

          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Arlington Ridge address"
            className="border rounded-2xl p-4"
          />

          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
            placeholder="Phone number"
            className="border rounded-2xl p-4"
          />
        </div>

        <div className="bg-gray-50 border rounded-2xl p-4 mt-5">
          <div className="font-semibold mb-2">Willing to Help With</div>
          <p className="text-sm text-gray-600 mb-3">
            Select any request categories you would be willing to support as a helper.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {requestCategories.map((category) => {
              const selected = form.serviceCategories.includes(category);

              return (
                <label
                  key={category}
                  className={
                    selected
                      ? "border border-red-300 bg-red-50 rounded-2xl p-3 flex items-center gap-2 font-semibold"
                      : "border rounded-2xl p-3 flex items-center gap-2 bg-white"
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
        </div>

        <div className="bg-gray-50 border rounded-2xl p-4 mt-5">
          <div className="font-semibold mb-2">Terms and Conditions</div>
          <p className="text-sm text-gray-600 mb-3">
            You must review and accept the Hurricane Hearts Terms and Conditions before requesting access.
          </p>

          <button
            onClick={() => setShowTerms(true)}
            className="bg-white border px-4 py-2 rounded-xl font-semibold mr-3"
          >
            View Terms
          </button>

          <label className="inline-flex items-center gap-2 text-sm font-semibold mt-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            I have read and accept the Terms and Conditions.
          </label>
        </div>

        <button
          onClick={saveProfile}
          className="w-full mt-6 bg-red-600 text-white py-4 rounded-2xl font-semibold"
        >
          Submit Access Request
        </button>
      </div>

      {showTerms && <TermsAndConditions onClose={() => setShowTerms(false)} />}
    </div>
  );
}