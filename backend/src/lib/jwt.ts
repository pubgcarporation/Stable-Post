import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  wallet: string;
};

export function signAccessToken(
  secret: string,
  payload: JwtPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "7d"
): string {
  return jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" });
}

export function verifyAccessToken(secret: string, token: string): JwtPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;
  if (typeof decoded.sub !== "string" || typeof decoded.wallet !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub: decoded.sub, wallet: decoded.wallet };
}
