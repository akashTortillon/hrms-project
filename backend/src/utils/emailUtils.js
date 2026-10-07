// Email lookups for login. Emails are compared case-insensitively, but the old lookup built a
// regex straight from what was typed, so (a) a trailing space from a phone keyboard or paste
// made the match fail, and (b) characters with regex meaning broke it - "ali+kitchen@x.com"
// never matched because "+" means "one or more" in a regex.
export const normalizeEmail = (value) => String(value ?? "").trim();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mongo filter matching `email` exactly (ignoring case) after trimming the typed value.
export const emailMatchFilter = (value) => ({
  email: { $regex: new RegExp(`^${escapeRegex(normalizeEmail(value))}$`, "i") }
});
