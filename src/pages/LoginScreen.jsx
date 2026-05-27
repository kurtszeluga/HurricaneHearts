
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
const ACCESS_SUCCESS_KEY = "hurricaneHeartsAccessRequestSuccess";
const TERMS_VERSION = "1.0";

const emptyForm = {
  email: "",
  password: "",
  name: "",
  address: "",
  phone: ""
};

export default function LoginScreen({ message }) {
  const storedMessage = sessionStorage.getItem(BLOCK_MESSAGE_KEY) || "";
  const displayMessage = message || storedMessage;

  const [mode, setMode] = useState("login");
  const [showTerms, setShowTerms] = useState(false);
}