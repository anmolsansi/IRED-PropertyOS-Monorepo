import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Field-level encryption service for sensitive data at rest.
 * Uses AES-256-GCM with a key derived from ENCRYPTION_KEY env var.
 *
 * Encrypted fields in this system:
 * - User mobile numbers
 * - Client mobile numbers
 * - Contact mobile numbers
 * - SMTP credentials (stored in env, encrypted in transit)
 *
 * Usage in services:
 *   const encrypted = this.encryption.encrypt(plaintext);
 *   const decrypted = this.encryption.decrypt(encrypted);
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key: Buffer | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const encKey = this.config.get<string>("ENCRYPTION_KEY");
    if (encKey) {
      // Derive a 32-byte key from the hex-encoded env var
      this.key = Buffer.from(encKey, "hex");
      if (this.key.length !== 32) {
        this.logger.warn(
          "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
            "Generate with: openssl rand -hex 32",
        );
        this.key = null;
      } else {
        this.logger.log("Field-level encryption enabled");
      }
    } else {
      this.logger.warn(
        "ENCRYPTION_KEY not set — sensitive fields stored in plaintext. " +
          "Set ENCRYPTION_KEY in .env for production.",
      );
    }
  }

  /**
   * Encrypt a plaintext string. Returns base64-encoded ciphertext.
   * Format: base64(iv + tag + encrypted)
   */
  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    const result = Buffer.concat([iv, tag, encrypted]);
    return result.toString("base64");
  }

  /**
   * Decrypt a base64-encoded ciphertext string.
   * If decryption fails (e.g., data was never encrypted), returns the original string.
   */
  decrypt(ciphertext: string): string {
    if (!this.key) return ciphertext;

    try {
      const buffer = Buffer.from(ciphertext, "base64");

      if (buffer.length < IV_LENGTH + TAG_LENGTH + 1) {
        return ciphertext; // Too short to be encrypted
      }

      const iv = buffer.subarray(0, IV_LENGTH);
      const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch {
      // Decryption failed — data was likely stored plaintext
      return ciphertext;
    }
  }

  /**
   * Check if a value appears to be encrypted (base64 format with correct length).
   */
  isEncrypted(value: string): boolean {
    if (!this.key) return false;
    try {
      const buffer = Buffer.from(value, "base64");
      return buffer.length >= IV_LENGTH + TAG_LENGTH + 1;
    } catch {
      return false;
    }
  }
}
