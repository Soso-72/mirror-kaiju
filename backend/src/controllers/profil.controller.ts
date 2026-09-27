import { getProfil } from "../services/profilService.js";

export const getUserProfil = async (req: any, res: any) => {
  const userId = req.user?.userId ?? req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Utilisateur non authentifié",
    });
  }

  const profil = await getProfil(Number(userId));

  if (!profil) {
    return res.status(404).json({
      success: false,
      message: "Profil not found",
    });
  }

  return res.status(200).json({
    success: true,
    response: {
      ...profil,
      name: profil.email.split("@")[0],
    },
  });
};