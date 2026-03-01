import { Request, Response, NextFunction } from "express";
import VehicleService from "../services/VehicleService";

class VehicleController {
  private service = new VehicleService();

  async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createVehicle(req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em createVehicle:", error);
      return res.status(500).json("Erro interno ao criar veículo.");
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateVehicle(id, req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em updateVehicle:", error);
      return res.status(500).json("Erro interno ao atualizar veículo.");
    }
  }

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteVehicle(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em deleteVehicle:", error);
      return res.status(500).json("Erro interno ao deletar veículo.");
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

  async findVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findVehicles(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em findVehicles:", error);
      return res.status(500).json("Erro interno ao buscar veículos.");
    }
  }

  async getVehiclesByIds(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body; // Espera um array de strings no body
    const result = await this.service.getVehiclesByIds(ids);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Erro em getVehiclesByIds:", error);
    return res.status(500).json("Erro interno ao buscar veículos em lote.");
  }
}
}

export default VehicleController;
