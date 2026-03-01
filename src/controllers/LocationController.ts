import { Request, Response, NextFunction } from "express";
import LocationService from "../services/LocationService";

class LocationController {
  private service = new LocationService();

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createLocation(req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em createLocation:", error);
      return res.status(500).json("Erro interno ao criar localização.");
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateLocation(id, req.body);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em updateLocation:", error);
      return res.status(500).json("Erro interno ao atualizar localização.");
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteLocation(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em deleteLocation:", error);
      return res.status(500).json("Erro interno ao deletar localização.");
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getLocation(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em getLocation:", error);
      return res.status(500).json("Erro interno ao buscar localização.");
    }
  }

  async findLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findLocations(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em findLocations:", error);
      return res.status(500).json("Erro interno ao buscar localizações.");
    }
  }
}

export default LocationController;
