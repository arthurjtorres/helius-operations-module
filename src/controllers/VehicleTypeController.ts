import { Request, Response, NextFunction } from "express";
import VehicleTypeService from "../services/VehicleTypeService";

class VehicleTypeController {
  private service = new VehicleTypeService();

  async createVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createVehicleType(req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em createVehicleType:", error);
      return res.status(500).json("Erro interno ao criar tipo de veículo.");
    }
  }

  async updateVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateVehicleType(id, req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em updateVehicleType:", error);
      return res.status(500).json("Erro interno ao atualizar tipo de veículo.");
    }
  }

  async deleteVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteVehicleType(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em deleteVehicleType:", error);
      return res.status(500).json("Erro interno ao deletar tipo de veículo.");
    }
  }

  async getVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getVehicleType(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em getVehicleType:", error);
      return res.status(500).json("Erro interno ao buscar tipo de veículo.");
    }
  }

  async findVehicleTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findVehicleTypes(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em findVehicleTypes:", error);
      return res.status(500).json("Erro interno ao buscar tipos de veículo.");
    }
  }
}

export default VehicleTypeController;
