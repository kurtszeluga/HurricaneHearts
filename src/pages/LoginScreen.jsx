import { useState } from "react";
import { motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import TermsAndConditions from "../components/TermsAndConditions";
import {
  formatPhoneNumber,
  normalizePhoneNumber
} from "../utils/formatPhoneNumber";
import { queueAccessRequestEmails } from "../utils/emailNotifications";

const BLOCK_MESSAGE_KEY =
  "hurricaneHeartsAuthMessage";

const AUTH_MODE_KEY =
  "hurricaneHeartsAuthMode";

const ACCESS_SUCCESS_KEY =
  "hurricaneHeartsAccessRequestSuccess";

const TERMS_VERSION = "1.0";

const emptyForm = {
  email: "",
  password: "",
  name: "",
  address: "",
  phone: ""
};

export default function LoginScreen({ message }) {

  const storedMessage =
    sessionStorage.getItem(BLOCK_MESSAGE_KEY) || "";

  const displayMessage =
    message || storedMessage;

  const [mode, setMode] =
    useState("login");

  const [showTerms, setShowTerms] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [showSuccessSplash, setShowSuccessSplash] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [form, setForm] =
    useState(emptyForm);

  const updateForm = (field, value) => {

    setForm((current) => ({
      ...current,

      [field]:
        field === "phone"
          ? formatPhoneNumber(value)
          : value
    }));
  };

  const loginWithEmail = async () => {

    try {

      sessionStorage.removeItem(
        BLOCK_MESSAGE_KEY
      );

      sessionStorage.removeItem(
        ACCESS_SUCCESS_KEY
      );

      sessionStorage.setItem(
        AUTH_MODE_KEY,
        "login"
      );

      await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

    } catch (error) {

      console.error(error);

      alert(
        "Login failed. Please check your email and password."
      );
    }
  };

  const resetPassword = async () => {

    try {

      if (!form.email.trim()) {

        alert(
          "Please enter your email address first."
        );

        return;
      }

      await sendPasswordResetEmail(
        auth,
        form.email.trim()
      );

      alert(
        "Password reset email sent. Please check your inbox."
      );

    } catch (error) {

      console.error(error);

      alert(
        "Unable to send password reset email. Please try again."
      );
    }
  };

  const requestAccessWithEmail = async () => {

    if (submitting) {
      return;
    }

    try {

      setSubmitting(true);

      if (
        !form.email.trim() ||
        !form.password ||
        !form.name.trim() ||
        !form.address.trim() ||
        !form.phone.trim()
      ) {

        alert(
          "Please complete name, address, phone, email, and password."
        );

        setSubmitting(false);

        return;
      }

      if (!acceptedTerms) {

        alert(
          "Please review and accept the Terms and Conditions before submitting your access request."
        );

        setSubmitting(false);

        return;
      }

      sessionStorage.removeItem(
        BLOCK_MESSAGE_KEY
      );

      sessionStorage.setItem(
        AUTH_MODE_KEY,
        "requestAccess"
      );

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password
        );

      const accessRequestProfile = {
        uid: credential.user.uid,

        name: form.name.trim(),

        email: form.email.trim(),

        address: form.address.trim(),

        phone: normalizePhoneNumber(
          form.phone
        ),

        serviceCategories: [],

        role: "resident",

        approved: false,

        active: true,

        profileComplete: true,

        firstLoginProfileRequired: true,

        firstLoginProfileCompletedAt: null,

        authProvider: "password",

        termsAccepted: true,

        termsAcceptedAt: serverTimestamp(),

        termsVersion: TERMS_VERSION,

        accessRequestedAt: serverTimestamp(),

        createdAt: serverTimestamp()
      };

      await setDoc(
        doc(db, "users", credential.user.uid),
        accessRequestProfile
      );

      await queueAccessRequestEmails(
        db,
        accessRequestProfile
      ).catch((error) => {
        console.error(
          "Access request email queue error:",
          error
        );
      });

      sessionStorage.setItem(
        ACCESS_SUCCESS_KEY,
        "true"
      );

      sessionStorage.setItem(
        AUTH_MODE_KEY,
        "login"
      );

      setForm({
        email: "",
        password: "",
        name: "",
        address: "",
        phone: ""
      });

      setAcceptedTerms(false);

      setShowTerms(false);

      setMode("login");

      setSubmitting(false);

      setShowSuccessSplash(true);

      signOut(auth).catch((error) => {
        console.error(
          "Sign out after access request failed:",
          error
        );
      });

    } catch (error) {

      console.error(error);

      setSubmitting(false);

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        alert(
          "An account already exists for this email. Please use Login instead."
        );

        return;
      }

      if (
        error.code ===
        "auth/weak-password"
      ) {

        alert(
          "Please use a password with at least 6 characters."
        );

        return;
      }

      alert(
        "Unable to submit access request. Please try again."
      );
    }
  };

  if (showSuccessSplash) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-[#e8edf3] p-6">

        <div className="bg-white border border-[#c7d0dc] rounded-xl shadow-lg p-8 max-w-md w-full text-center">

          <div className="text-2xl font-bold text-[#b42318] mb-4">
            Request Submitted
          </div>

          <p className="text-[#475467] text-base leading-relaxed">
            Your Hurricane Hearts account request has been submitted and is pending administrator approval.
          </p>

          <button
            type="button"
            onClick={() => {

              setShowSuccessSplash(false);

              sessionStorage.removeItem(
                ACCESS_SUCCESS_KEY
              );
            }}
            className="mt-6 bg-[#b42318] hover:bg-[#9f1f16] text-white px-5 py-2.5 rounded-lg font-semibold transition"
          >
            Return to Login
          </button>

        </div>

      </div>
    );
  }

  return (

    <div className="min-h-screen bg-[#e8edf3] flex items-center justify-center p-6">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#c7d0dc] rounded-xl shadow-lg p-8 max-w-md w-full"
      >

        <div className="flex items-center gap-4 mb-6">

          <img
            src="/hurricane-hearts-logo.jpg"
            alt="Hurricane Hearts logo"
            className="w-14 h-14 object-contain shrink-0 rounded-lg border border-[#c7d0dc] bg-white p-1"
          />

          <div>

            <h1 className="text-3xl font-bold text-[#172033] leading-tight">

              Hurricane He

              <span className="text-[#b42318]">
                AR
              </span>

              ts

            </h1>

            <p className="text-[#667085] text-sm font-semibold uppercase tracking-wide">
              Arlington Ridge Community
            </p>

          </div>

        </div>

        {displayMessage && (

          <div className="bg-[#fff7ed] text-[#7c2d12] border border-[#fed7aa] rounded-lg p-4 mb-6 text-sm font-medium">

            {displayMessage}

          </div>
        )}

        <div className="flex gap-2 mb-5">

          <button
            type="button"
            onClick={() => setMode("login")}
            disabled={submitting}
            className={
              mode === "login"
                ? "flex-1 bg-[#b42318] text-white py-2.5 rounded-lg font-semibold"
                : "flex-1 bg-[#f1f5f9] text-[#475467] border border-[#c7d0dc] py-2.5 rounded-lg font-semibold"
            }
          >
            Login
          </button>

          <button
            type="button"
            onClick={() =>
              setMode("requestAccess")
            }
            disabled={submitting}
            className={
              mode === "requestAccess"
                ? "flex-1 bg-[#b42318] text-white py-2.5 rounded-lg font-semibold"
                : "flex-1 bg-[#f1f5f9] text-[#475467] border border-[#c7d0dc] py-2.5 rounded-lg font-semibold"
            }
          >
            Request Access
          </button>

        </div>

        {mode === "requestAccess" && (

          <div className="grid gap-3 mb-3">

            <input
              value={form.name}
              onChange={(e) =>
                updateForm(
                  "name",
                  e.target.value
                )
              }
              placeholder="Full name"
              disabled={submitting}
              className="border border-[#c7d0dc] rounded-lg p-3.5"
            />

            <input
              value={form.address}
              onChange={(e) =>
                updateForm(
                  "address",
                  e.target.value
                )
              }
              placeholder="Arlington Ridge address"
              disabled={submitting}
              className="border border-[#c7d0dc] rounded-lg p-3.5"
            />

            <input
              value={form.phone}
              onChange={(e) =>
                updateForm(
                  "phone",
                  e.target.value
                )
              }
              placeholder="Phone number"
              disabled={submitting}
              className="border border-[#c7d0dc] rounded-lg p-3.5"
            />

            <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4">

              <div className="font-semibold mb-2">
                Terms and Conditions
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTerms(true)
                }
                disabled={submitting}
                className="bg-white border border-[#c7d0dc] px-4 py-2 rounded-lg font-semibold mr-3"
              >
                View Terms
              </button>

              <label className="inline-flex items-center gap-2 text-sm font-semibold mt-3">

                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  disabled={submitting}
                  onChange={(e) =>
                    setAcceptedTerms(
                      e.target.checked
                    )
                  }
                />

                I accept the Terms and Conditions.

              </label>

            </div>

          </div>
        )}

        <div className="grid gap-3">

          <input
            value={form.email}
            onChange={(e) =>
              updateForm(
                "email",
                e.target.value
              )
            }
            placeholder="Email address"
            type="email"
            disabled={submitting}
            className="border border-[#c7d0dc] rounded-lg p-3.5"
          />

          <input
            value={form.password}
            onChange={(e) =>
              updateForm(
                "password",
                e.target.value
              )
            }
            placeholder="Password"
            type="password"
            disabled={submitting}
            className="border border-[#c7d0dc] rounded-lg p-3.5"
          />

          <button
            type="button"
            disabled={submitting}
            onClick={
              mode === "login"
                ? loginWithEmail
                : requestAccessWithEmail
            }
            className={
              submitting
                ? "w-full bg-gray-400 text-white py-3 rounded-lg font-semibold transition cursor-not-allowed"
                : "w-full bg-[#b42318] hover:bg-[#9f1f16] text-white py-3 rounded-lg font-semibold transition"
            }
          >

            {submitting
              ? "Submitting..."
              : mode === "login"
                ? "Login"
                : "Submit Access Request"}

          </button>

          {mode === "login" && (

            <button
              type="button"
              onClick={resetPassword}
              disabled={submitting}
              className="text-sm text-[#b42318] hover:text-[#9f1f16] underline font-semibold"
            >
              Forgot password? Reset Password
            </button>

          )}

        </div>

        <p className="text-xs text-gray-500 mt-5 text-center">
          New users must request access and be approved by an administrator.
        </p>

      </motion.div>

      {showTerms && (

        <TermsAndConditions
          onClose={() =>
            setShowTerms(false)
          }
        />

      )}

    </div>
  );
}
