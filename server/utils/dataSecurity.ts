import crypto from "crypto";
import bcrypt from "bcryptjs";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-32-char-encryption-key-12345"; // Should be 32 chars
const IV_LENGTH = 16;

/**
 * Hashes sensitive data (like emails or identifiers) using bcrypt.
 */
export const hashData = async (data: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(data, salt);
};

/**
 * Compares data with a hash.
 */
export const compareHash = async (data: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(data, hash);
};

/**
 * Encrypts text using AES-256-CBC.
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Decrypts text using AES-256-CBC.
 */
export const decrypt = (text: string): string => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
