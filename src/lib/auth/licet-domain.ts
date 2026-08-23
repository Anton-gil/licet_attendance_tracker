const LICET_EMAIL_DOMAIN = "@licet.ac.in";

/** Only LICET students should be able to sign up (spec §8, step 1). */
export function isLicetEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(LICET_EMAIL_DOMAIN);
}
