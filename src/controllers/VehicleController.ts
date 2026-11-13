import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logError";
import Resp from "../utils/Response";
import VehicleService from "../services/VehicleService";

class VehicleController {
  private service = new VehicleService();

  async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createVehicle({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em createVehicle", error);
      const resp = Resp.internalError("Erro interno ao criar veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateVehicle(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em updateVehicle", error);
      const resp = Resp.internalError("Erro interno ao atualizar veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteVehicle(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em deleteVehicle", error);
      const resp = Resp.internalError("Erro interno ao deletar veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async reactivateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateVehicle(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em reactivateVehicle", error);
      const resp = Resp.internalError("Erro interno ao reativar veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async getVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getVehicle(id);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em getVehicle", error);
      const resp = Resp.internalError("Erro interno ao buscar veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  /** POST /lookup — consulta veículos por lista de IDs (corpo `{ ids }`). */
  async lookupVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.lookupVehicles(req.body?.ids);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em lookupVehicles", error);
      const resp = Resp.internalError("Erro interno ao consultar veículos em lote.");
      return res.status(resp.status).json(resp);
    }
  }

  async findVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findVehicles(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em findVehicles", error);
      const resp = Resp.internalError("Erro interno ao buscar veículos.");
      return res.status(resp.status).json(resp);
    }
  }

  /** POST /bulk — importa veículos em lote (`{ companyId, vehicles }`; `?dryRun=true` só valida). */
  async bulkImportVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = { ...req.body, userId: res.locals.user.userId };
      const result = await this.service.bulkImport(payload, { dryRun: req.query.dryRun === "true" });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em bulkImportVehicles", error);
      const resp = Resp.internalError("Erro interno ao importar veículos em lote.");
      return res.status(resp.status).json(resp);
    }
  }
}

export default VehicleController;
