// src/utils/controllerWrapper.ts

export function cw(fn: Function) {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (err: any) {
      console.error("❌ ERREUR CONTRÔLEUR :", err);

      // Si c'est une erreur personnalisée (AppError ou RuleValidationError)
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || "Internal Server Error";
      const code = err.code || "INTERNAL_ERROR";

      return res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
        },
      });
    }
  };
}