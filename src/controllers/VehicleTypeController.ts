import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logError";
import Resp from "../utils/Response";
import VehicleTypeService from "../services/VehicleTypeService";

class VehicleTypeController {
  private service = new VehicleTypeService();

  async createVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createVehicleType({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em createVehicleType", error);
      const resp = Resp.internalError("Erro interno ao criar tipo de veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async updateVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateVehicleType(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em updateVehicleType", error);
      const resp = Resp.internalError("Erro interno ao atualizar tipo de veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async deleteVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteVehicleType(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em deleteVehicleType", error);
      const resp = Resp.internalError("Erro interno ao deletar tipo de veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async reactivateVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateVehicleType(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em reactivateVehicleType", error);
      const resp = Resp.internalError("Erro interno ao reativar tipo de veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async getVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getVehicleType(id);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em getVehicleType", error);
      const resp = Resp.internalError("Erro interno ao buscar tipo de veículo.");
      return res.status(resp.status).json(resp);
    }
  }

  async findVehicleTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findVehicleTypes(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em findVehicleTypes", error);
      const resp = Resp.internalError("Erro interno ao buscar tipos de veículo.");
      return res.status(resp.status).json(resp);
    }
  }
}

export default VehicleTypeController;
