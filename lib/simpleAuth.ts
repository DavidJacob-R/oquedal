import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "insecure_dev_secret";

export function signSession(payload: object, maxAgeSec = 60 * 60 * 8) {
  return jwt.sign(payload, secret, { expiresIn: maxAgeSec });
}

export function verifySession(token: string) {
  try {
    return jwt.verify(token, secret) as any;
  } catch {
    return null;
  }
}
