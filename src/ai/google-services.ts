// src/ai/google-services.ts
'use server';

import 'dotenv/config'
import { google } from 'googleapis';

/**
 * Checks if the necessary Google Service Account credentials are configured in environment variables.
 * @returns {boolean} True if credentials are set, false otherwise.
 */
function areCredentialsConfigured() {
    return process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
}

/**
 * Formats the private key from environment variables by replacing escaped newlines.
 * @param {string} [key] - The private key string.
 * @returns {string | undefined} The formatted private key.
 */
function getFormattedPrivateKey(key?: string): string | undefined {
    if (!key) return undefined;
    return key.replace(/\\n/g, '\n');
}

/**
 * Creates and returns a Google Auth client using the service account credentials.
 * Throws an error if credentials are not configured.
 * @param {string | string[]} scopes - The required Google API scopes.
 * @returns {Promise<any>} A promise that resolves to the Google Auth client.
 */
export async function getGoogleAuth(scopes: string | string[]) {
  if (!areCredentialsConfigured()) {
      throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: getFormattedPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: scopes,
  });
  return auth;
}
