import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export async function createToken(
  userId: number,
  role: string,
  districtId: number | null
): Promise<string> {
  const secret = process.env.SECRET;

  if (!secret) {
    throw new Error("JWT secret is not defined in environment variables");
  }

  const payload = {
    userId: userId,
    role: role,
    districtId: districtId,
  };

  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  return token;
}