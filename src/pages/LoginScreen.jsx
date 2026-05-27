import { useEffect, useState } from "react";
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

const BLOCK_MESSAGE_KEY = "hurricaneHeartsAuthMessage";
const AUTH_MODE_KEY = "hurricaneHeartsAuthMode";
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

  const displayMessage = message || storedMessage;

  const [mode, setMode] = useState("login");
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showAccessSuccess, setShowAccessSuccess] = useState(false);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let timer = null;

    if (showAccessSuccess) {
      timer = setTimeout(() => {
        setShowAccessSuccess(false);
        setMode("login");
        setAcceptedTerms(false);
        setShowTerms(false);
        setForm(emptyForm);
        sessionStorage.removeItem(BLOCK_MESSAGE_KEY);
      }, 3500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showAccessSuccess]);

  const clearFormAndReturnToLogin = () => {
    setForm(emptyForm);
    setAcceptedTerms(false);
    setShowTerms(false);
    setMode("login");
    sessionStorage.removeItem(BLOCK_MESSAGE_KEY);
  };

  const updateForm = (field, value) => {
    setForm({
      ...form,
      [field]:
        field === "phone"
          ? formatPhoneNumber(value)
          : value
    });
  };

}