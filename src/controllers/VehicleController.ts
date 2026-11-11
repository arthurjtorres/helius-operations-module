import { Request, Response, NextFunction } from "express";
import VehicleService from "../services/VehicleService";

class VehicleController {
  private service = new VehicleService();

  async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createVehicle({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em createVehicle:", error);
      return res.status(500).json("Erro interno ao criar veículo.");
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateVehicle(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em updateVehicle:", error);
      return res.status(500).json("Erro interno ao atualizar veículo.");
    }
  }

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteVehicle(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em deleteVehicle:", error);
      return res.status(500).json("Erro interno ao deletar veículo.");
    }
  }

  async reactivateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateVehicle(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em reactivateVehicle:", error);
      return res.status(500).json("Erro interno ao reativar veículo.");
    }
  }

  async getVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getVehicle(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em getVehicle:", error);
      return res.status(500).json("Erro interno ao buscar veículo.");
    }
  }

  /** POST /lookup — consulta veículos por lista de IDs (corpo `{ ids }`). */
  async lookupVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.lookupVehicles(req.body?.ids);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em lookupVehicles:", error);
      return res.status(500).json("Erro interno ao consultar veículos em lote.");
    }
  }

  async findVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findVehicles(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em findVehicles:", error);
      return res.status(500).json("Erro interno ao buscar veículos.");
    }
  }

  /** POST /bulk — importa veículos em lote (`{ companyId, vehicles }`; `?dryRun=true` só valida). */
  async bulkImportVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = { ...req.body, userId: res.locals.user.userId };
      const result = await this.service.bulkImport(payload, { dryRun: req.query.dryRun === "true" });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em bulkImportVehicles:", error);
      return res.status(500).json("Erro interno ao importar veículos em lote.");
    }
  }
}

export default VehicleController;
