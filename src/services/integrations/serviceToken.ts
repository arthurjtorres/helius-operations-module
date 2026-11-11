import jwt, { SignOptions } from "jsonwebtoken";
import { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/** Validade do token de serviço, em segundos (curta: gerado a cada requisição). */
const SERVICE_TOKEN_TTL_SECONDS = 60;

/**
 * Gera um JWT de serviço (HS256, 60 s) assinado com `JWT_SECRET`.
 * O payload não carrega pessoa, e-mail, clearance, roles, módulos nem menus (ADR-011).
 *
 * @param serviceName Nome do módulo que chama (ex.: `control`).
 * @throws Error se `JWT_SECRET` estiver ausente ou vazio.
 */
export const signServiceToken = (serviceName: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("JWT_SECRET não definido ou vazio.");
  }

  const options: SignOptions = { algorithm: "HS256", expiresIn: SERVICE_TOKEN_TTL_SECONDS };
  return jwt.sign(
    {
      tokenType: "service",
      userId: `service:${serviceName}`,
      userName: serviceName,
      usertag: serviceName,
      roles: [],
      modules: [],
      allowedMenus: [],
    },
    secret,
    options
  );
};

/**
 * Registra um interceptor que envia `Authorization: Bearer <token de serviço>`
 * em cada requisição. Não sobrescreve um `Authorization` já definido.
 *
 * @param instance Instância Axios do módulo de destino.
 * @param serviceName Nome do módulo que chama.
 */
export const attachServiceToken = (instance: AxiosInstance, serviceName: string): void => {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!config.headers.has("Authorization")) {
      config.headers.set("Authorization", `Bearer ${signServiceToken(serviceName)}`);
    }
    return config;
  });
};
