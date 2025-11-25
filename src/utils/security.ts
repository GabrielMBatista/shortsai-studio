/**
 * Simple client-side encryption utility to prevent plain-text storage of API Keys.
 * Note: Since this is client-side only, it is technically obfuscation, not military-grade encryption,
 * as the key logic resides in the bundle. However, it prevents casual snooping in LocalStorage.
 */

const SALT = 'ShortsAI-Studio-V1-Salt';

export const encryptData = (text: string): string => {
  try {
    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: any) => textToChars(SALT).reduce((a, b) => a ^ b, code);

    return text
      .split("")
      .map(textToChars)
      .map(applySaltToChar)
      .map(byteHex)
      .join("");
  } catch (e) {
    console.error("Encryption failed", e);
    return text; // Fallback to plain text if fail
  }
};

export const decryptData = (encoded: string): string => {
  try {
    // CRITICAL FIX: Check if string is valid Hex before decrypting.
    // API Keys (Gemini/ElevenLabs) usually contain non-hex chars like 'AIza', 'sk_', '_', etc.
    // If it contains non-hex characters, it is PLAIN TEXT. Return as is.
    const isHex = /^[0-9a-fA-F]+$/.test(encoded);
    if (!isHex || encoded.trim() === "") return encoded;

    const textToChars = (text: string) => text.split("").map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: any) => textToChars(SALT).reduce((a, b) => a ^ b, code);
    
    return (encoded.match(/.{1,2}/g) || [])
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join("");
  } catch (e) {
    // If decryption fails, assume it was legacy plain text
    return encoded;
  }
};