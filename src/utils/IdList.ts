import joi from "joi";

/** Máximo de IDs aceitos por consulta em lote (`/lookup`). */
export const MAX_LOOKUP_IDS = 500;

const idListSchema = joi.array().items(joi.string().uuid()).min(1).max(MAX_LOOKUP_IDS).required();

/**
 * Valida a lista de IDs de uma consulta em lote. Remove repetidos antes de validar.
 * @param value Valor recebido em `req.body.ids`.
 * @returns `{ ids }` válidos (UUIDs, sem repetição) ou `{ error }` com a mensagem ao cliente.
 */
export const parseIdList = (value: unknown): { ids: string[] } | { error: string } => {
  const list = Array.isArray(value) ? Array.from(new Set(value)) : value;
  const { error, value: ids } = idListSchema.validate(list);
  if (!error) return { ids: ids as string[] };

  const kind = error.details[0]?.type;
  if (kind === "array.max") return { error: `Máximo de ${MAX_LOOKUP_IDS} IDs por consulta.` };
  if (kind === "string.guid" || kind === "string.base") return { error: "A lista contém ID inválido." };
  return { error: "Lista de IDs não informada." };
};
