import { CameraTypeEnum } from "../database/models/enums/CameraTypeEnum";

/** Máximo de veículos por requisição de importação em lote (T09). */
export const MAX_BULK_ITEMS = 500;

/** Tamanho máximo de texto livre (as colunas são `VARCHAR(255)`). */
export const MAX_TEXT_LENGTH = 255;

/** Item de importação como chega do cliente (qualquer campo pode vir ausente ou com tipo errado). */
export interface RawVehicleItem {
  vehicleNumber?: unknown;
  brand?: unknown;
  licensePlate?: unknown;
  chassisNumber?: unknown;
  fabricationYear?: unknown;
  modelYear?: unknown;
  renavan?: unknown;
  typeVehicleName?: unknown;
  capacity?: unknown;
  model?: unknown;
  hasWifi?: unknown;
  cameraType?: unknown;
}

/** Item que passou na validação de formato (ainda não conferido contra o banco). */
export interface ValidVehicleItem {
  /** Posição do item na lista enviada, começando em 1. */
  line: number;
  vehicleNumber: string;
  brand: string;
  /** Placa em maiúsculas, como informada (com ou sem hífen). */
  licensePlate: string;
  /** Placa só com letras e números, usada para detectar duplicidade (ABC-1234 = ABC1234). */
  plateKey: string;
  chassisNumber: string;
  fabricationYear: string;
  modelYear: string;
  renavan: string;
  typeVehicleName: string;
  /** Tipo normalizado (sem acento, maiúsculo, espaços únicos) para comparação exata. */
  typeKey: string;
  capacity: number;
  model: string;
  hasWifi: boolean;
  cameraType: CameraTypeEnum;
}

/** Erro de um item. */
export interface ItemFailure {
  line: number;
  vehicleNumber?: string;
  field: string;
  error: string;
  /** `CONFLICT` quando o registro já existe inativo ou em outro veículo (ADR-010). */
  code?: "INVALID" | "CONFLICT";
}

/**
 * Normaliza texto para comparação exata: remove acentos, põe em maiúsculas e reduz espaços.
 * @param text Texto original.
 */
export const normalizeText = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Reduz a placa a letras e números em maiúsculas.
 * @param plate Placa como informada.
 */
export const plateKey = (plate: string): string => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Variações de gravação da mesma placa (com e sem hífen), para achar duplicidade no banco
 * mesmo que o cadastro unitário tenha usado outro formato.
 * @param key Placa já normalizada por `plateKey`.
 */
export const plateVariants = (key: string): string[] =>
  key.length === 7 ? [key, `${key.slice(0, 3)}-${key.slice(3)}`] : [key];

/**
 * Converte "sim/não" e equivalentes em booleano.
 * @param value Booleano, texto (SIM, NÃO, S, N, TRUE, FALSE, 1, 0) ou número 1/0.
 * @returns O valor, ou `null` se não reconhecido.
 */
export const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === 0) return value === 1;
  if (typeof value !== "string") return null;
  const v = normalizeText(value);
  if (["SIM", "S", "TRUE", "VERDADEIRO", "1"].includes(v)) return true;
  if (["NAO", "N", "FALSE", "FALSO", "0"].includes(v)) return false;
  return null;
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Ano com 4 dígitos entre 1950 e o ano seguinte ao atual (aceita número ou texto). */
const parseYear = (value: unknown): string | null => {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 1950 && year <= new Date().getFullYear() + 1 ? raw : null;
};

/**
 * Valida o formato de cada veículo da importação e detecta repetições dentro da própria lista
 * (número, placa, chassi e renavam). Não consulta o banco.
 * @param items Lista recebida no corpo da requisição.
 * @returns Itens válidos e as falhas (uma por problema, com linha e campo).
 */
export const validateVehicleItems = (items: unknown[]): { valid: ValidVehicleItem[]; failed: ItemFailure[] } => {
  const valid: ValidVehicleItem[] = [];
  const failed: ItemFailure[] = [];
  const seen = { vehicleNumber: new Map<string, number>(), plate: new Map<string, number>(), chassis: new Map<string, number>(), renavan: new Map<string, number>() };

  items.forEach((raw, index) => {
    const line = index + 1;
    const item = (raw && typeof raw === "object" ? raw : {}) as RawVehicleItem;
    const problems: Omit<ItemFailure, "line" | "vehicleNumber" | "code">[] = [];
    const bad = (field: string, error: string) => problems.push({ field, error });
    const long = (field: string, label: string, v: string) => v.length > MAX_TEXT_LENGTH && bad(field, `${label} longo demais (máximo ${MAX_TEXT_LENGTH} caracteres).`);

    const vehicleNumber = text(item.vehicleNumber) ?? (typeof item.vehicleNumber === "number" ? String(item.vehicleNumber) : null);
    if (!vehicleNumber) bad("vehicleNumber", "Número do veículo não informado.");
    else long("vehicleNumber", "Número do veículo", vehicleNumber);

    const brand = text(item.brand);
    if (!brand) bad("brand", "Marca não informada.");
    else long("brand", "Marca", brand);

    const model = text(item.model);
    if (!model) bad("model", "Modelo não informado.");
    else long("model", "Modelo", model);

    const typeVehicleName = text(item.typeVehicleName);
    if (!typeVehicleName) bad("typeVehicleName", "Tipo de veículo não informado.");
    else long("typeVehicleName", "Tipo de veículo", typeVehicleName);

    const rawPlate = text(item.licensePlate);
    const plate = rawPlate ? rawPlate.toUpperCase() : null;
    if (!plate) bad("licensePlate", "Placa não informada.");
    else if (!/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(plate)) bad("licensePlate", "Placa inválida; use AAA-0000 ou AAA0A00.");

    const chassisRaw = text(item.chassisNumber);
    const chassis = chassisRaw ? chassisRaw.toUpperCase().replace(/\s+/g, "") : null;
    if (!chassis) bad("chassisNumber", "Chassi não informado.");
    else if (!/^[A-Z0-9]{8,25}$/.test(chassis)) bad("chassisNumber", "Chassi inválido; use de 8 a 25 letras e números.");

    const renavanRaw = typeof item.renavan === "number" ? String(item.renavan) : text(item.renavan);
    const renavan = renavanRaw ? renavanRaw.replace(/\D/g, "") : null;
    if (!renavan) bad("renavan", "Renavam não informado.");
    else if (!/^\d{9,11}$/.test(renavan)) bad("renavan", "Renavam inválido; use de 9 a 11 dígitos.");

    const fabricationYear = parseYear(item.fabricationYear);
    if (!fabricationYear) bad("fabricationYear", "Ano de fabricação inválido; use 4 dígitos.");
    const modelYear = parseYear(item.modelYear);
    if (!modelYear) bad("modelYear", "Ano do modelo inválido; use 4 dígitos.");
    else if (fabricationYear && Number(modelYear) < Number(fabricationYear)) bad("modelYear", "Ano do modelo anterior ao ano de fabricação.");

    const capacity = typeof item.capacity === "string" && /^\d+$/.test(item.capacity.trim()) ? Number(item.capacity.trim()) : item.capacity;
    if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 1 || capacity > 300) {
      bad("capacity", "Capacidade inválida; use um número inteiro de 1 a 300.");
    }

    const hasWifi = parseBoolean(item.hasWifi);
    if (hasWifi === null) bad("hasWifi", "Wi-Fi inválido; use SIM ou NÃO.");

    const cameraRaw = text(item.cameraType);
    const camera = cameraRaw ? (cameraRaw.toUpperCase() as CameraTypeEnum) : null;
    if (!camera || !Object.values(CameraTypeEnum).includes(camera)) {
      bad("cameraType", `Tipo de câmera inválido; use ${Object.values(CameraTypeEnum).join(" ou ")}.`);
    }

    const dup = (map: Map<string, number>, key: string | null, field: string, label: string) => {
      if (!key) return;
      const first = map.get(key);
      if (first !== undefined) bad(field, `${label} repetido no arquivo (primeira ocorrência na linha ${first}).`);
      else map.set(key, line);
    };
    dup(seen.vehicleNumber, vehicleNumber, "vehicleNumber", "Número do veículo");
    dup(seen.plate, plate ? plateKey(plate) : null, "licensePlate", "Placa");
    dup(seen.chassis, chassis, "chassisNumber", "Chassi");
    dup(seen.renavan, renavan, "renavan", "Renavam");

    if (problems.length) {
      problems.forEach(p => failed.push({ line, vehicleNumber: vehicleNumber ?? undefined, code: "INVALID", ...p }));
      return;
    }

    valid.push({
      line,
      vehicleNumber: vehicleNumber as string,
      brand: brand as string,
      licensePlate: plate as string,
      plateKey: plateKey(plate as string),
      chassisNumber: chassis as string,
      fabricationYear: fabricationYear as string,
      modelYear: modelYear as string,
      renavan: renavan as string,
      typeVehicleName: typeVehicleName as string,
      typeKey: normalizeText(typeVehicleName as string),
      capacity: capacity as number,
      model: model as string,
      hasWifi: hasWifi as boolean,
      cameraType: camera as CameraTypeEnum,
    });
  });

  return { valid, failed };
};
