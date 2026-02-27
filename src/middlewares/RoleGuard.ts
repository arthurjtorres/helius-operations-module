import { NextFunction, Request, Response as ExpressResponse } from "express";
import Response, { StandardResponse } from "../utils/Response";
import { JwtPayload } from "./Authentication";

export const authorize = (allowedTypes: string[]) => {
  return (req: Request, res: ExpressResponse, next: NextFunction) => {
    const user = res.locals.user as JwtPayload;

    if (!user || !allowedTypes.includes(user.userType)) {
      const resp = Response.forbidden(`Tipo de usuário não permitido. Necessário: ${allowedTypes.join(' ou ')}`);
      return res.status(resp.status).json({ message: resp.message });
    }

    next();
  };
};