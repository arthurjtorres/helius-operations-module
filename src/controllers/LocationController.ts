import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logError";
import Resp from "../utils/Response";
import LocationService from "../services/LocationService";

class LocationController {
  private service = new LocationService();

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createLocation({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em createLocation", error);
      const resp = Resp.internalError("Erro interno ao criar localização.");
      return res.status(resp.status).json(resp);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateLocation(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em updateLocation", error);
      const resp = Resp.internalError("Erro interno ao atualizar localização.");
      return res.status(resp.status).json(resp);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteLocation(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em deleteLocation", error);
      const resp = Resp.internalError("Erro interno ao deletar localização.");
      return res.status(resp.status).json(resp);
    }
  }

  async reactivateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateLocation(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em reactivateLocation", error);
      const resp = Resp.internalError("Erro interno ao reativar localização.");
      return res.status(resp.status).json(resp);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getLocation(id);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em getLocation", error);
      const resp = Resp.internalError("Erro interno ao buscar localização.");
      return res.status(resp.status).json(resp);
    }
  }

  /** POST /lookup — consulta localizações por lista de IDs (corpo `{ ids }`). */
  async lookupLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.getLocationsByIds(req.body?.ids);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em lookupLocations", error);
      const resp = Resp.internalError("Erro interno ao consultar localizações em lote.");
      return res.status(resp.status).json(resp);
    }
  }

  async findLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findLocations(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em findLocations", error);
      const resp = Resp.internalError("Erro interno ao buscar localizações.");
      return res.status(resp.status).json(resp);
    }
  }
}

export default LocationController;
