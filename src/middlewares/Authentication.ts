import jwt from "jsonwebtoken";
import 'dotenv/config';
import { NextFunction, Request, Response as ExpressResponse } from "express";
import Response from "../utils/Response";

const secret = process.env.JWT_SECRET as string;

export interface MenuPermission {
  menu: string;
  permissions: string[];
}

export interface UserModuleRole {
  module: string;
  role: string;
}

export interface JwtPayload {
  userId: string;
  userName: string;
  usertag: string;
  email: string;
  userType: string;
  clearance: string;
  modules: string[]; 
  roles: UserModuleRole[];
  allowedMenus: MenuPermission[];
}

const verifyToken = (req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return Response.unauthorized('Token não fornecido');
    }
    const decoded = jwt.verify(token, secret) as JwtPayload;
    res.locals.user = decoded
    next();
  } catch (error) {
    return Response.unauthorized('Token inválido');
  }
}

export { verifyToken };