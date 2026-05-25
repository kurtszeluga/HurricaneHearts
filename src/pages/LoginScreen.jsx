const requestAccessWithEmail = async () => {
  try {
    if (
      !form.email.trim() ||
      !form.password ||
      !form.name.trim() ||
      !form.address.trim() ||
      !form.phone.trim()
    ) {
      alert("Please complete name, address, phone, email, and password.");
      return;
    }

    if (!acceptedTerms) {
      alert("Please review and accept the Terms and Conditions before submitting your access request.");
      return;
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      form.email.trim(),
      form.password
    );

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      name: form.name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      phone: normalizePhoneNumber(form.phone),
      serviceCategories: [],
      role: "resident",
      approved: false,
      active: true,
      profileComplete: true,
      authProvider: "password",
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: TERMS_VERSION,
      accessRequestedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    await signOut(auth);

    sessionStorage.removeItem(BLOCK_MESSAGE_KEY);

    alert("Your access request has been submitted and is pending admin approval.");

    setMode("login");
    setAcceptedTerms(false);
    setShowTerms(false);
    setForm({
      email: "",
      password: "",
      name: "",
      address: "",
      phone: ""
    });
  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      alert("An account already exists for this email. Please use Login instead.");
      return;
    }

    if (error.code === "auth/weak-password") {
      alert("Please use a password with at least 6 characters.");
      return;
    }

    alert("Unable to submit access request. Please try again.");
  }
};