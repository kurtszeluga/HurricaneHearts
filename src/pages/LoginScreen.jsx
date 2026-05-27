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
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";

const BLOCK_MESSAGE_KEY = "hurricaneHeartsAuthMessage";
const AUTH_MODE_KEY = "hurricaneHeartsAuthMode";
const ACCESS_SUCCESS_KEY = "hurricaneHeartsAccessRequestSuccess";
const TERMS_VERSION = "1.0";

const emptyForm = {
  email: "",
  password: "",
  name: "",
  address: "",
  phone: "",
  serviceCategories: []
};

export default function LoginScreen({ message }) {
  const [mode, setMode] = useState("login");
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(() => {
    return sessionStorage.getItem(ACCESS_SUCCESS_KEY) === "true";
  });
  const [form, setForm] = useState(emptyForm);

}