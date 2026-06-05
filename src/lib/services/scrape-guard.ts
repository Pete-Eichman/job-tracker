const MIN_LENGTH = 200;
// Matches at least two of the common job-posting signal words.
const JOB_SIGNALS = /responsibilit|require|experience|skill|qualif|apply|role/gi;
const MIN_SIGNAL_MATCHES = 2;

const USER_MESSAGE =
  "Could not read this posting — paste the text directly.";

export function assertLooksLikeJobPosting(input: {
  contentType: string | null;
  strippedText: string;
}): void {
  const { contentType, strippedText } = input;

  // Allow null/missing content-type (some servers omit it), but reject
  // clearly non-HTML types (JSON APIs, PDFs served incorrectly, etc.).
  if (
    contentType !== null &&
    contentType !== "" &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml")
  ) {
    throw new Error(USER_MESSAGE);
  }

  if (strippedText.length < MIN_LENGTH) {
    throw new Error(USER_MESSAGE);
  }

  const matches = strippedText.match(JOB_SIGNALS);
  if (!matches || matches.length < MIN_SIGNAL_MATCHES) {
    throw new Error(USER_MESSAGE);
  }
}
