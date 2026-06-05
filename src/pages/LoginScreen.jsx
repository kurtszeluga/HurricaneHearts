import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import TermsAndConditions from "../components/TermsAndConditions";
import {
  formatPhoneNumber,
  normalizePhoneNumber
} from "../utils/formatPhoneNumber";
import {
  formatAddress,
  isAddressComplete
} from "../utils/addressFields";
import { queueAccessRequestEmails } from "../utils/emailNotifications";
import {
  getLoginIdMessage,
  isValidLoginId,
  looksLikeEmail,
  normalizeLoginId
} from "../utils/loginId";

const BLOCK_MESSAGE_KEY =
  "hurricaneHeartsAuthMessage";

const AUTH_MODE_KEY =
  "hurricaneHeartsAuthMode";

const ACCESS_SUCCESS_KEY =
  "hurricaneHeartsAccessRequestSuccess";

const TERMS_VERSION = "1.0";

const emptyForm = {
  email: "",
  loginId: "",
  hasEmail: "yes",
  password: "",
  name: "",
  houseNumber: "",
  streetName: "",
  city: "",
  zip: "",
  arLotNumber: "",
  phone: ""
};

export default function LoginScreen({ message }) {

  const displayMessage = message || "";

  const [mode, setMode] =
    useState("login");

  const [showTerms, setShowTerms] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [termsReviewed, setTermsReviewed] =
    useState(false);

  const [showSuccessSplash, setShowSuccessSplash] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [form, setForm] =
    useState(emptyForm);
  const [addressMismatchDialog, setAddressMismatchDialog] =
    useState(null);
  const addressMismatchResolverRef = useRef(null);

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

  const updateForm = (field, value) => {

    setForm((current) => ({
      ...current,

      [field]:
        field === "phone"
          ? formatPhoneNumber(value)
          : value
    }));
  };

  const buildHiddenAuthEmail = (loginIdKey) =>
    `${loginIdKey}@users.hurricanehearts.org`;

  const resolveLoginEmail = async ({ includeDetails = false } = {}) => {
    const loginValue = form.email.trim();

    if (!loginValue) {
      throw new Error("Please enter your email or User ID.");
    }

    if (looksLikeEmail(loginValue)) {
      return includeDetails
        ? {
            email: loginValue,
            hasEmail: true
          }
        : loginValue;
    }

    if (!isValidLoginId(loginValue)) {
      throw new Error("Invalid login or password.");
    }

    const response = await fetch("/api/resolve-login-id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: loginValue
      })
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.email) {
      throw new Error(body?.error || "Invalid login or password.");
    }

    return includeDetails
      ? {
          email: body.email,
          hasEmail: body.hasEmail !== false
        }
      : body.email;
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

      const loginEmail = await resolveLoginEmail();

      await signInWithEmailAndPassword(auth, loginEmail, form.password);

    } catch (error) {

      console.error(error);

      alert(
        error.message || "Login failed. Please check your email/User ID and password."
      );
    }
  };

  const resetPassword = async () => {

    try {

      if (!form.email.trim()) {

        alert(
          "Please enter your email or User ID first."
        );

        return;
      }

      const login = await resolveLoginEmail({ includeDetails: true });

      if (!login.hasEmail) {
        alert(
          "This User ID does not have an email address on file. Please contact the Hurricane Hearts administrator to reset your password."
        );
        return;
      }

      await sendPasswordResetEmail(auth, login.email);

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
          city: form.city,
          zip: form.zip,
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

  const requestAccessWithEmail = async () => {

    if (submitting) {
      return;
    }

    try {

      setSubmitting(true);

      const hasEmail = form.hasEmail !== "no";
      const requestedLoginId = form.loginId.trim();

      if (
        (hasEmail && !form.email.trim()) ||
        (!hasEmail && !requestedLoginId) ||
        !form.password ||
        !form.name.trim() ||
        !isAddressComplete(form) ||
        !form.phone.trim()
      ) {

        alert(
          hasEmail
            ? "Please complete name, house number, street name, city, zip, AR lot number, phone, email, and password."
            : "Please complete name, house number, street name, city, zip, AR lot number, phone, User ID, and password."
        );

        setSubmitting(false);

        return;
      }

      if (!termsReviewed || !acceptedTerms) {

        alert(
          "Please open the Terms and Conditions, scroll to the bottom, and accept them before submitting your access request."
        );

        setSubmitting(false);

        return;
      }

      const addressValidation = await validateSignupAddress();
      const addressVerificationEnabled = addressValidation.configured;
      let addressVerificationOverride = false;
      let addressVerificationOverrideNote = "";

      if (addressValidation.configured && !addressValidation.valid) {
        const mismatchDecision = await askAddressMismatch();

        if (mismatchDecision.action === "cancel") {
          setForm(emptyForm);
          setAcceptedTerms(false);
          setTermsReviewed(false);
          setShowTerms(false);
          setMode("login");
          setSubmitting(false);
          return;
        }

        if (mismatchDecision.action !== "submit") {
          setSubmitting(false);
          return;
        }

        addressVerificationOverride = true;
        addressVerificationOverrideNote = mismatchDecision.note || "";
      }

      if (requestedLoginId && !isValidLoginId(requestedLoginId)) {

        alert(getLoginIdMessage());

        setSubmitting(false);

        return;
      }

      const loginIdKey = requestedLoginId
        ? normalizeLoginId(requestedLoginId)
        : "";
      const authEmail = hasEmail
        ? form.email.trim()
        : buildHiddenAuthEmail(loginIdKey);

      if (requestedLoginId) {
        const loginIdResponse = await fetch("/api/check-login-id", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            loginId: requestedLoginId
          })
        });
        const loginIdBody = await loginIdResponse.json().catch(() => ({}));

        if (!loginIdResponse.ok || !loginIdBody.available) {

          alert(
            loginIdBody?.error || "That User ID is already taken. Please choose another one."
          );

          setSubmitting(false);

          return;
        }
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
          authEmail,
          form.password
        );

      const accessRequestProfile = {
        uid: credential.user.uid,

        name: form.name.trim(),

        email: hasEmail ? form.email.trim() : "",

        hasEmail,

        authEmail,

        loginId: requestedLoginId,

        loginIdKey,

        houseNumber: form.houseNumber.trim(),

        streetName: form.streetName.trim(),

        city: form.city.trim(),

        zip: form.zip.trim(),

        arLotNumber: form.arLotNumber.trim(),

        address: formatAddress(form),

        addressVerified:
          addressVerificationEnabled &&
          addressValidation.configured &&
          addressValidation.valid,

        addressVerificationRequired:
          addressVerificationEnabled,

        addressVerificationOverride,

        addressVerificationOverrideNote:
          addressVerificationOverrideNote.trim(),

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

      const batch = writeBatch(db);

      batch.set(
        doc(db, "users", credential.user.uid),
        accessRequestProfile
      );

      if (requestedLoginId) {
        batch.set(
          doc(db, "loginIds", loginIdKey),
          {
            uid: credential.user.uid,
            loginId: requestedLoginId,
            loginIdKey,
            email: hasEmail ? form.email.trim() : "",
            authEmail,
            active: true,
            createdAt: serverTimestamp()
          }
        );
      }

      await batch.commit();

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
        loginId: "",
        hasEmail: "yes",
        password: "",
        name: "",
        houseNumber: "",
        streetName: "",
        city: "",
        zip: "",
        arLotNumber: "",
        phone: ""
      });

      setAcceptedTerms(false);
      setTermsReviewed(false);

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
        auth.currentUser &&
        error.code !== "auth/email-already-in-use"
      ) {
        await auth.currentUser.delete().catch((deleteError) => {
          console.error(
            "Access request cleanup failed:",
            deleteError
          );
        });
      }

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

                  <div className="rounded-md border border-[#c7d0dc] bg-[#f8fafc] p-3">
                    <div className="mb-2 text-sm font-semibold text-[#172033]">
                      Do you have an email address?
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#475467]">
                        <input
                          type="radio"
                          name="hasEmail"
                          value="yes"
                          checked={form.hasEmail !== "no"}
                          disabled={submitting}
                          onChange={() => updateForm("hasEmail", "yes")}
                        />
                        Yes
                      </label>

                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#475467]">
                        <input
                          type="radio"
                          name="hasEmail"
                          value="no"
                          checked={form.hasEmail === "no"}
                          disabled={submitting}
                          onChange={() => updateForm("hasEmail", "no")}
                        />
                        No
                      </label>
                    </div>
                  </div>

                  {form.hasEmail !== "no" && (
                    <input
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="Email address"
                      type="email"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3"
                    />
                  )}

                  <div>
                    <input
                      value={form.loginId}
                      onChange={(e) => updateForm("loginId", e.target.value)}
                      placeholder={
                        form.hasEmail === "no"
                          ? "Create User ID"
                          : "Create User ID (optional)"
                      }
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3 w-full"
                    />
                    <div className="mt-1 text-xs text-[#667085]">
                      {form.hasEmail === "no"
                        ? getLoginIdMessage()
                        : `Optional. ${getLoginIdMessage()}`}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={form.houseNumber}
                      onChange={(e) => updateForm("houseNumber", e.target.value)}
                      placeholder="House number"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3"
                    />

                    <input
                      value={form.streetName}
                      onChange={(e) => updateForm("streetName", e.target.value)}
                      placeholder="Street name"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3"
                    />

                    <input
                      value={form.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                      placeholder="City"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3"
                    />

                    <input
                      value={form.zip}
                      onChange={(e) => updateForm("zip", e.target.value)}
                      placeholder="Zip"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3"
                    />

                    <input
                      value={form.arLotNumber}
                      onChange={(e) => updateForm("arLotNumber", e.target.value)}
                      placeholder="AR Lot number"
                      disabled={submitting}
                      className="border border-[#c7d0dc] rounded-md p-3 sm:col-span-2"
                    />
                  </div>

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
                        disabled={submitting || !termsReviewed}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      I accept the Terms and Conditions.
                    </label>
                    {!termsReviewed && (
                      <p className="mt-2 text-xs font-semibold text-[#667085]">
                        Open the terms and scroll to the bottom before accepting.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {mode === "login" && (
                  <input
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="Email or User ID"
                    type="text"
                    disabled={submitting}
                    className="border border-[#c7d0dc] rounded-md p-3"
                  />
                )}

                <input
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  disabled={submitting}
                  className="border border-[#c7d0dc] rounded-md p-3"
                />

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#475467]">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    disabled={submitting}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>

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

      </main>

      <footer className="bg-white border-t border-[#d8e0ea]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-[#667085]">
          <div>
            <div className="font-bold text-[#172033]">Hurricane Hearts</div>
            <div>Arlington Ridge neighbor-to-neighbor assistance.</div>
          </div>
          <div className="text-sm text-[#667085]">
            Copyright 2026 Hurricane Hearts. All rights reserved.
          </div>
        </div>
      </footer>

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
              The house number, street name, city, zip, and AR lot number did not match the community address directory.
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
