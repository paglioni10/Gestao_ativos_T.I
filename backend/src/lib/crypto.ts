import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM: criptografia simétrica autenticada.
// - "simétrica": a mesma chave cifra e decifra (por isso é REVERSÍVEL, ao
//   contrário do bcrypt usado em senhas de login, que é hash de mão única).
// - "GCM": além de cifrar, gera uma authTag que detecta adulteração.
//
// A chave de 32 bytes é derivada da chave-mestra do .env via scrypt.
const KEY = scryptSync(env.credentialsKey, "gestao-ativos-salt", 32);

export interface EncryptedSecret {
  secretEncrypted: string; // texto cifrado (hex)
  iv: string; // vetor de inicialização (hex)
  authTag: string; // tag de autenticação do GCM (hex)
}

// Cifra um texto puro e devolve os 3 pedaços necessários para decifrar depois.
export function encryptSecret(plain: string): EncryptedSecret {
  // O IV deve ser único por cifragem; 12 bytes é o tamanho recomendado p/ GCM.
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return {
    secretEncrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

// Decifra de volta para o texto puro. Se a authTag não bater (dado adulterado
// ou chave errada), o decipher.final() lança erro — comportamento desejado.
export function decryptSecret({
  secretEncrypted,
  iv,
  authTag,
}: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secretEncrypted, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
