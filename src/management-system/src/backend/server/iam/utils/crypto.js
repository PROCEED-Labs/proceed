import * as crypto from 'crypto';
import { Buffer } from 'buffer';

const ALGO = 'aes-256-gcm';
const GCM_IV_SIZE = 12;
const GCM_TAG_SIZE = 16;

export const encrypt = (value, encKey) => {
  const encKeyBytes = Buffer.from(encKey, 'hex');

  const ivBytes = Buffer.from(crypto.randomBytes(GCM_IV_SIZE));

  const cipher = crypto.createCipheriv(ALGO, encKeyBytes, ivBytes);

  const encryptedBytes = cipher.update(value);
  const finalBytes = cipher.final();
  const ciphertextBytes = Buffer.concat([encryptedBytes, finalBytes]);

  return Buffer.concat([ciphertextBytes, ivBytes, cipher.getAuthTag()]).toString('base64');
};

export const decrypt = (userId, value, encKey) => {
  const allBytes = Buffer.from(value, 'base64');

  const size = userId.length + GCM_IV_SIZE + GCM_TAG_SIZE;
  if (allBytes.length !== size) {
    throw new Error('The received csrf token has an invalid length');
  }

  const ciphertextBytes = allBytes.slice(0, userId.length);

  let offset = userId.length;
  const ivBytes = allBytes.slice(offset, offset + GCM_IV_SIZE);

  offset += GCM_IV_SIZE;
  const tagBytes = allBytes.slice(offset, allBytes.length);

  try {
    const encKeyBytes = Buffer.from(encKey, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKeyBytes, ivBytes);
    decipher.setAuthTag(tagBytes);

    const decryptedBytes = decipher.update(ciphertextBytes);
    const finalBytes = decipher.final();

    return Buffer.concat([decryptedBytes, finalBytes]).toString();
  } catch (e) {
    throw new Error(e.toString());
  }
};
