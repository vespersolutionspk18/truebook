import { createHash, randomBytes } from 'crypto';

export async function generatePKCEChallenge() {
  // Generate a random verifier
  const verifier = randomBytes(32).toString('base64url');

  // Generate the challenge from the verifier
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return {
    codeVerifier: verifier,
    codeChallenge: challenge
  };
} 