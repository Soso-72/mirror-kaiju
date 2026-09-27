import { getUserPasswordByEMail } from "../services/userAuth.js";
import { verifyPassword } from "../utils/verifPassword.js";
import { createToken } from "../utils/createToken.js";
import { AppError } from "../errors/AppError.js";

export async function loginUser(req: { body: any }, res: any) {
  if (!req.body || !req.body.email || !req.body.password) {
    throw new AppError(
      "VALIDATION_ERROR",
      400,
      "Email et mot de passe sont requis."
    );
  }

  const { email, password } = req.body;

  const userData = await getUserPasswordByEMail(email);

  if (!userData) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      401,
      "Email ou mot de passe incorrect."
    );
  }

  const isPasswordValid = await verifyPassword(password, userData.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      401,
      "Email ou mot de passe incorrect."
    );
  }

  const token = await createToken(userData.id, userData.role, userData.districtId);

  return res.status(200).json({
    success: true,
    response: {
      role: userData.role,
      id: userData.id,
      districtId: userData.districtId,
      token,
    },
  });
}