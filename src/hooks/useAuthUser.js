import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const BLOCK_MESSAGE_KEY = "hurricaneHeartsAuthMessage";
const AUTH_MODE_KEY = "hurricaneHeartsAuthMode";
const ACCESS_SUCCESS_KEY = "hurricaneHeartsAccessRequestSuccess";

function isProfileComplete(profile) {
  return Boolean(
    profile.name?.trim() &&
      profile.email?.trim() &&
      profile.address?.trim() &&
      profile.phone?.trim()
  );
}

export default function useAuthUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState(() => {
    return sessionStorage.getItem(BLOCK_MESSAGE_KEY) || "";
  });

  const blockAndSignOut = async (message) => {
    sessionStorage.setItem(BLOCK_MESSAGE_KEY, message);
    setAuthMessage(message);
    setUser(null);
    await signOut(auth);
    setLoading(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const authMode = sessionStorage.getItem(AUTH_MODE_KEY);
        const accessSuccess =
          sessionStorage.getItem(ACCESS_SUCCESS_KEY) === "true";

        // Do not interfere while LoginScreen is creating a new access request.
        if (authMode === "requestAccess" || accessSuccess) {
          setUser(null);
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await blockAndSignOut(
            "No Hurricane Hearts account profile was found for this email address. Please choose Request Access to submit an access request."
          );
          return;
        }

        const existing = userSnap.data();

        const profile = {
          uid: firebaseUser.uid,
          name: existing.name || "",
          email: existing.email || firebaseUser.email || "",
          address: existing.address || "",
          phone: existing.phone || "",
          serviceCategories: existing.serviceCategories || [],
          role: existing.role || "resident",
          approved: existing.approved ?? false,
          active: existing.active ?? true,
          profileComplete: false,
          termsAccepted: existing.termsAccepted ?? false,
          termsVersion: existing.termsVersion || "",
          authProvider: existing.authProvider || "password"
        };

        profile.profileComplete = isProfileComplete(profile);

        if (profile.active === false) {
          await blockAndSignOut(
            "Your account is inactive. Please contact the Hurricane Hearts administrator for assistance."
          );
          return;
        }

        if (!profile.termsAccepted) {
          await blockAndSignOut(
            "You must accept the Terms and Conditions before using Hurricane Hearts. Please request access again."
          );
          return;
        }

        if (profile.approved === false && profile.role !== "admin") {
          await blockAndSignOut(
            "Your account is pending approval. Please contact the Hurricane Hearts administrator if you need access sooner."
          );
          return;
        }

        sessionStorage.removeItem(BLOCK_MESSAGE_KEY);
        sessionStorage.removeItem(ACCESS_SUCCESS_KEY);
        setAuthMessage("");
        setUser(profile);
        setLoading(false);
      } catch (error) {
        console.error("Auth profile error:", error);
        await blockAndSignOut(
          "There was a problem loading your account profile. Please contact the Hurricane Hearts administrator."
        );
      }
    });

    return () => unsub();
  }, []);

  return { user, setUser, loading, authMessage };
}