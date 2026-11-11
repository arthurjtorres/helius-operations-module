import { ClearanceEnum, clearanceRank, CLEARANCE_RANK } from '../database/models/enums/ClearanceEnum';

describe('hierarquia de clearance (ADR-013)', () => {
  it('mantém a ordem SYSTEM_ADMIN > SUPER_ADMIN > ADMIN > SUPERVISOR > USUARIO', () => {
    const ordem = [
      ClearanceEnum.SYSTEM_ADMIN,
      ClearanceEnum.SUPER_ADMIN,
      ClearanceEnum.ADMIN,
      ClearanceEnum.SUPERVISOR,
      ClearanceEnum.USUARIO,
    ];
    for (let i = 0; i < ordem.length - 1; i++) {
      expect(clearanceRank(ordem[i])).toBeGreaterThan(clearanceRank(ordem[i + 1]));
    }
  });

  it('todo nível do enum tem posição maior que zero', () => {
    Object.values(ClearanceEnum).forEach(n => expect(CLEARANCE_RANK[n]).toBeGreaterThan(0));
  });

  it('nome ausente ou desconhecido não tem poder algum', () => {
    expect(clearanceRank(undefined)).toBe(0);
    expect(clearanceRank(null)).toBe(0);
    expect(clearanceRank('')).toBe(0);
    expect(clearanceRank('INVENTADO')).toBe(0);
  });
});
