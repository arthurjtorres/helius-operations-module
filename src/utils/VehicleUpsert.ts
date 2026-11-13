import { normalizeText, plateKey, ValidVehicleItem } from "./VehicleImport";

/** Diferença de um campo entre o cadastro e a planilha (T10). Os valores aparecem na resposta, nunca em log. */
export interface FieldChange {
  field:
    | "licensePlate" | "brand" | "model" | "fabricationYear" | "modelYear"
    | "typeVehicleName" | "capacity" | "hasWifi" | "cameraType" | "activated";
  current: string | number | boolean | null;
  new: string | number | boolean;
}

/** Veículo cadastrado, como lido do banco. */
export interface CurrentVehicle {
  vehicleId: string;
  vehicleNumber: string;
  fkVehicleCompanyId: string;
  licensePlate: string;
  chassisNumber: string;
  renavan: string;
  brand: string;
  model: string;
  fabricationYear: string;
  modelYear: string;
  fkTypeVehicleId: string;
  capacity: number;
  hasWifi: boolean;
  cameraType: string;
  activated: boolean;
}

/** Tudo o que a comparação precisa saber sobre um item cujo número já existe. */
export interface ComparisonInput {
  item: ValidVehicleItem;
  /** Tipo da planilha já resolvido para o id (tipo ativo, nome exato). */
  typeVehicleId: string;
  companyId: string;
  vehicle: CurrentVehicle;
  /** Nome do tipo atual, para o relatório. */
  currentTypeName: string | null;
}

/** Item que não pode ser atualizado: a divergência está num campo de identidade. */
export interface ComparisonConflict {
  conflict: { field: string; error: string };
}

/** O que mudaria no veículo. Lista vazia = item inalterado. */
export interface ComparisonResult {
  changes: FieldChange[];
  patch: Record<string, string | number | boolean>;
}

/**
 * Compara um item da planilha com o veículo cadastrado pelo mesmo número, seguindo as categorias
 * aprovadas na T10: número, chassi, renavam e empresa são identidade (divergência = conflito; número
 * com outro chassi é outro veículo); placa, marca, modelo, anos, tipo, capacidade, Wi-Fi e câmera
 * são atualizáveis. A placa é comparada sem hífen (ABC-1234 = ABC1234), para a conversão Mercosul
 * contar como mudança e a simples troca de formato não. Marca e modelo que diferem só em caixa ou
 * acento contam como iguais.
 * A unicidade da placa nova contra outros veículos é conferida pelo serviço.
 */
export const compareVehicle = (input: ComparisonInput): ComparisonConflict | ComparisonResult => {
  const { item, typeVehicleId, companyId, vehicle, currentTypeName } = input;

  if (vehicle.chassisNumber.toUpperCase() !== item.chassisNumber.toUpperCase()) {
    return { conflict: { field: "chassisNumber", error: "Número já usado por outro veículo (chassi diferente)." } };
  }
  if (vehicle.renavan !== item.renavan) {
    return { conflict: { field: "renavan", error: "Renavam diferente do cadastrado para este veículo." } };
  }
  if (vehicle.fkVehicleCompanyId !== companyId) {
    return { conflict: { field: "companyId", error: "Veículo já cadastrado em outra empresa." } };
  }

  const changes: FieldChange[] = [];
  const patch: Record<string, string | number | boolean> = {};
  const set = (field: FieldChange["field"], column: string, current: FieldChange["current"], value: string | number | boolean) => {
    changes.push({ field, current, new: value });
    patch[column] = value;
  };

  if (!vehicle.activated) set("activated", "activated", false, true);
  if (plateKey(vehicle.licensePlate) !== item.plateKey) set("licensePlate", "licensePlate", vehicle.licensePlate, item.licensePlate);
  if (normalizeText(vehicle.brand) !== normalizeText(item.brand)) set("brand", "brand", vehicle.brand, item.brand);
  if (normalizeText(vehicle.model) !== normalizeText(item.model)) set("model", "model", vehicle.model, item.model);
  if (vehicle.fabricationYear !== item.fabricationYear) set("fabricationYear", "fabricationYear", vehicle.fabricationYear, item.fabricationYear);
  if (vehicle.modelYear !== item.modelYear) set("modelYear", "modelYear", vehicle.modelYear, item.modelYear);
  if (vehicle.fkTypeVehicleId !== typeVehicleId) {
    changes.push({ field: "typeVehicleName", current: currentTypeName, new: item.typeVehicleName });
    patch.fkTypeVehicleId = typeVehicleId;
  }
  if (vehicle.capacity !== item.capacity) set("capacity", "capacity", vehicle.capacity, item.capacity);
  if (vehicle.hasWifi !== item.hasWifi) set("hasWifi", "hasWifi", vehicle.hasWifi, item.hasWifi);
  if (vehicle.cameraType !== item.cameraType) set("cameraType", "cameraType", vehicle.cameraType, item.cameraType);

  return { changes, patch };
};

/** `true` se a comparação terminou em conflito. */
export const isConflict = (r: ComparisonConflict | ComparisonResult): r is ComparisonConflict => "conflict" in r;

/** Opções da importação lidas da requisição (mesmo formato de `ImportOptions` do serviço). */
export interface ParsedImportOptions {
  dryRun: boolean;
  mode: "insert" | "upsert";
  reactivate: boolean;
  confirmIds: string[];
}

/**
 * Lê `?dryRun`, `?mode`, `?reactivate` e `confirmIds` (corpo) da importação em lote.
 * Mesma regra do `registry` (T10).
 * @returns As opções, ou a mensagem de erro para responder 400.
 */
export const parseImportOptions = (
  query: Record<string, unknown>,
  body: Record<string, unknown> | undefined
): { options: ParsedImportOptions } | { error: string } => {
  const mode = query.mode ?? "insert";
  if (mode !== "insert" && mode !== "upsert") return { error: "Parâmetro mode inválido: use insert ou upsert." };
  const confirmIds: unknown = body?.confirmIds ?? [];
  if (!Array.isArray(confirmIds) || !confirmIds.every(id => typeof id === "string")) {
    return { error: "confirmIds deve ser uma lista de ids." };
  }
  if (mode === "insert" && (confirmIds.length || query.reactivate === "true")) {
    return { error: "confirmIds e reactivate só valem com mode=upsert." };
  }
  return { options: { dryRun: query.dryRun === "true", mode, reactivate: query.reactivate === "true", confirmIds: confirmIds as string[] } };
};
