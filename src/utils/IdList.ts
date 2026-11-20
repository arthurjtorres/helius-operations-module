import joi from "joi";

/** Máximo de IDs aceitos por consulta em lote (`/lookup`). */
export const MAX_LOOKUP_IDS = 500;


/**
 * Valida a lista de IDs de uma consulta em lote. Remove repetidos antes de validar.
 * @param value Valor recebido em `req.body.ids`.
 * @param max Máximo de IDs aceitos (padrão: `MAX_LOOKUP_IDS`).
 * @returns `{ ids }` válidos (UUIDs, sem repetição) ou `{ error }` com a mensagem ao cliente.
 */
export const parseIdList = (value: unknown, max = MAX_LOOKUP_IDS): { ids: string[] } | { error: string } => {
  const list = Array.isArray(value) ? Array.from(new Set(value)) : value;
  const { error, value: ids } = joi.array().items(joi.string().uuid()).min(1).max(max).required().validate(list);
  if (!error) return { ids: ids as string[] };

  const kind = error.details[0]?.type;
  if (kind === "array.max") return { error: `Máximo de ${max} IDs por consulta.` };
  if (kind === "string.guid" || kind === "string.base") return { error: "A lista contém ID inválido." };
  return { error: "Lista de IDs não informada." };
};
