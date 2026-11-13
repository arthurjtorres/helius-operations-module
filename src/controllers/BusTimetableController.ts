import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logError";
import Resp from "../utils/Response";
import BusTimetableService from "../services/BusTimetableService";

class BusTimetableController {
  private service = new BusTimetableService();

  async createBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createBusTimetable({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em createBusTimetable", error);
      const resp = Resp.internalError("Erro interno ao criar tabela de horário.");
      return res.status(resp.status).json(resp);
    }
  }

  async updateBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateBusTimetable(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em updateBusTimetable", error);
      const resp = Resp.internalError("Erro interno ao atualizar tabela de horário.");
      return res.status(resp.status).json(resp);
    }
  }

  async deleteBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteBusTimetable(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em deleteBusTimetable", error);
      const resp = Resp.internalError("Erro interno ao deletar tabela de horário.");
      return res.status(resp.status).json(resp);
    }
  }

  async reactivateBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateBusTimetable(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em reactivateBusTimetable", error);
      const resp = Resp.internalError("Erro interno ao reativar tabela de horário.");
      return res.status(resp.status).json(resp);
    }
  }

  async getBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getBusTimetable(id);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em getBusTimetable", error);
      const resp = Resp.internalError("Erro interno ao buscar tabela de horário.");
      return res.status(resp.status).json(resp);
    }
  }

  /** POST /lookup — consulta tabelas de horário por lista de IDs (corpo `{ ids }`). */
  async lookupBusTimetables(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.getBusTimetablesByIds(req.body?.ids);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em lookupBusTimetables", error);
      const resp = Resp.internalError("Erro interno ao consultar tabelas de horário em lote.");
      return res.status(resp.status).json(resp);
    }
  }

  async findBusTimetables(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findBusTimetables(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      logError("Erro em findBusTimetables", error);
      const resp = Resp.internalError("Erro interno ao buscar tabelas de horário.");
      return res.status(resp.status).json(resp);
    }
  }
}

export default BusTimetableController;
