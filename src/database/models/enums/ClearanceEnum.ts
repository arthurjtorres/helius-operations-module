/**
 * Níveis de acesso (`clearance_level.clearance_name`, schema do `control`), do mais alto ao mais baixo (ADR-013).
 * Cópia reduzida da hierarquia do `control`: a ordem precisa ser mantida igual nos módulos.
 */
export enum ClearanceEnum {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  USUARIO = 'USUARIO',
}

/** Posição de cada nível na hierarquia (maior = mais poder). */
export const CLEARANCE_RANK: Readonly<Record<ClearanceEnum, number>> = {
  [ClearanceEnum.SYSTEM_ADMIN]: 5,
  [ClearanceEnum.SUPER_ADMIN]: 4,
  [ClearanceEnum.ADMIN]: 3,
  [ClearanceEnum.SUPERVISOR]: 2,
  [ClearanceEnum.USUARIO]: 1,
};

/**
 * Posição do nível na hierarquia.
 * @param name Nome do nível (`clearance_name`).
 * @returns 1 a 5; `0` para nome ausente ou desconhecido (sem poder algum).
 */
export const clearanceRank = (name?: string | null): number =>
  (name && CLEARANCE_RANK[name as ClearanceEnum]) || 0;

/** Menor nível que dispensa permissão por menu (bypass de administrador). */
export const FULL_ACCESS_CLEARANCE = ClearanceEnum.SUPER_ADMIN;

/** Role de manutenção do sistema que dispensa permissão por menu (ainda não cadastrada no banco). */
export const DEVELOPER_ROLE = 'DESENVOLVEDOR';
