export const CURRENT_TERMS_VERSION = "1.0";
export const CURRENT_TERMS_EFFECTIVE_DATE = "June 5, 2026";

export function requiresTermsAcceptance(user = {}) {
  return (
    user.termsAccepted !== true ||
    user.termsVersion !== CURRENT_TERMS_VERSION
  );
}
