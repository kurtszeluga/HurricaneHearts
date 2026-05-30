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
    <div className="min-h-screen bg-[#f5f7fa] text-[#172033]">
      <header className="sticky top-0 z-20 bg-white/95 border-b border-[#d8e0ea] backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/hurricane-hearts-logo.jpg"
              alt="Hurricane Hearts logo"
              className="w-11 h-11 object-contain rounded-lg border border-[#d8e0ea] bg-white p-1"
            />
            <div>
              <div className="text-xl font-bold leading-tight">
                Hurricane He<span className="text-[#b42318]">AR</span>ts
              </div>
              <div className="text-[11px] font-semibold uppercase text-[#667085]">
                Arlington Ridge Community
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#475467]">
            <a className="hover:text-[#b42318]" href="#mission">Mission</a>
            <a className="hover:text-[#b42318]" href="#how-it-works">How It Works</a>
            <a className="hover:text-[#b42318]" href="#updates">Updates</a>
            <a className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-3 py-2 rounded-md" href="#access">
              Member Access
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[680px] overflow-hidden">
          <img
            src="/hurricane-hearts-community-hero.png"
            alt="Neighbors organizing emergency supplies in a Florida community"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#101828]/55" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid lg:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="pt-4 lg:pt-16 max-w-3xl text-white">
              <div className="inline-flex max-w-full bg-white/15 border border-white/25 rounded-md px-3 py-1 text-center text-[13px] sm:text-sm font-bold uppercase leading-tight">
                Neighbor-to-neighbor hurricane support
              </div>
              <h1 className="mt-5 text-3xl sm:text-5xl font-bold leading-tight text-[#fff1f0] [text-shadow:0_3px_14px_rgba(0,0,0,0.75)]">
                Coordinating help before, during, and after the storm.
              </h1>
              <p className="mt-5 text-lg text-slate-100 leading-relaxed max-w-2xl">
                Hurricane Hearts helps Arlington Ridge residents request assistance, volunteer support, and stay connected when a weather event affects the community.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#access"
                  className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-5 py-3 rounded-md font-bold"
                >
                  Sign In
                </a>
                <button
                  type="button"
                  onClick={() => setMode("requestAccess")}
                  className="bg-white text-[#172033] hover:bg-[#f1f5f9] px-5 py-3 rounded-md font-bold"
                >
                  Request Access
                </button>
              </div>
            </div>

            <motion.div
              id="access"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#d8e0ea] rounded-lg shadow-xl p-5 sm:p-6"
            >
              <div className="mb-5">
                <h2 className="text-2xl font-bold">
                  Member Access
                </h2>
                <p className="text-sm text-[#667085] mt-1">
                  Sign in or request an approved resident account.
                </p>
              </div>

              {displayMessage && (
                <div className="bg-[#fff7ed] text-[#7c2d12] border border-[#fed7aa] rounded-md p-3 mb-4 text-sm font-medium">
                  {displayMessage}
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  disabled={submitting}
                  className={
                    mode === "login"
                      ? "flex-1 bg-[#b42318] text-white py-2.5 rounded-md font-semibold"
                      : "flex-1 bg-[#f1f5f9] text-[#475467] border border-[#c7d0dc] py-2.5 rounded-md font-semibold"
                  }
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() => setMode("requestAccess")}
                  disabled={submitting}
                  className={
                    mode === "requestAccess"
                      ? "flex-1 bg-[#b42318] text-white py-2.5 rounded-md font-semibold"
                      : "flex-1 bg-[#f1f5f9] text-[#475467] border border-[#c7d0dc] py-2.5 rounded-md font-semibold"
                  }
                >
                  Request Access
                </button>
              </div>

              {mode === "requestAccess" && (
                <div className="grid gap-3 mb-3">
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Full name"
                    disabled={submitting}
                    className="border border-[#c7d0dc] rounded-md p-3"
                  />

                  <input
                    value={form.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    placeholder="Arlington Ridge address"
                    disabled={submitting}
                    className="border border-[#c7d0dc] rounded-md p-3"
                  />

                  <input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="Phone number"
                    disabled={submitting}
                    className="border border-[#c7d0dc] rounded-md p-3"
                  />

                  <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-md p-3">
                    <div className="font-semibold mb-2">
                      Terms and Conditions
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      disabled={submitting}
                      className="bg-white border border-[#c7d0dc] px-3 py-2 rounded-md font-semibold mr-3"
                    >
                      View Terms
                    </button>

                    <label className="inline-flex items-center gap-2 text-sm font-semibold mt-3">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        disabled={submitting}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      I accept the Terms and Conditions.
                    </label>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <input
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="Email address"
                  type="email"
                  disabled={submitting}
                  className="border border-[#c7d0dc] rounded-md p-3"
                />

                <input
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="Password"
                  type="password"
                  disabled={submitting}
                  className="border border-[#c7d0dc] rounded-md p-3"
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
                      ? "w-full bg-gray-400 text-white py-3 rounded-md font-semibold cursor-not-allowed"
                      : "w-full bg-[#b42318] hover:bg-[#9f1f16] text-white py-3 rounded-md font-semibold"
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

              <p className="text-xs text-[#667085] mt-4 text-center">
                New users must request access and be approved by an administrator.
              </p>
            </motion.div>
          </div>
        </section>

        <section id="mission" className="bg-white border-y border-[#d8e0ea]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
            <div>
              <p className="text-xs font-bold uppercase text-[#b42318]">Our Mission</p>
              <h2 className="mt-2 text-3xl font-bold">
                A practical network for residents who need help and neighbors ready to help.
              </h2>
            </div>
            <p className="text-[#475467] leading-relaxed">
              Hurricane Hearts is built for the Arlington Ridge community. During an active event, residents can submit assistance requests, volunteers can claim requests they can support, and administrators can monitor activity, send updates, and keep the response organized.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ["Request Assistance", "Residents submit needs related to an active event, including category, urgency, and the number of people needed."],
              ["Volunteer Support", "Approved neighbors review open requests and claim the ones they can help with."],
              ["Stay Coordinated", "Admins track requests, documents, history, notifications, and weather alerts in one place."]
            ].map(([title, copy]) => (
              <article key={title} className="bg-white border border-[#d8e0ea] rounded-lg p-5 shadow-sm">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-[#667085] leading-relaxed mt-2">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="updates" className="bg-[#172033] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-xs font-bold uppercase text-[#fecdca]">Community Updates</p>
              <h2 className="mt-2 text-3xl font-bold">Weather-aware, event-focused, and resident-only.</h2>
              <p className="mt-3 text-slate-300 leading-relaxed max-w-3xl">
                The private member area includes NWS weather alerts, activation notices, request summaries, document links, resident directory tools, and email notifications.
              </p>
            </div>
            <a
              href="#access"
              className="inline-flex justify-center bg-white text-[#172033] hover:bg-[#f1f5f9] px-5 py-3 rounded-md font-bold"
            >
              Go To Access
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-[#d8e0ea]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-[#667085]">
          <div>
            <div className="font-bold text-[#172033]">Hurricane Hearts</div>
            <div>Arlington Ridge neighbor-to-neighbor assistance.</div>
          </div>
          <div className="flex flex-wrap gap-4 font-semibold">
            <a href="#mission" className="hover:text-[#b42318]">Mission</a>
            <a href="#how-it-works" className="hover:text-[#b42318]">How It Works</a>
            <a href="#access" className="hover:text-[#b42318]">Member Access</a>
          </div>
        </div>
      </footer>

      {showTerms && (
        <TermsAndConditions
          onClose={() => setShowTerms(false)}
        />
      )}
    </div>
  );
}
