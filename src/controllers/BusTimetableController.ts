import { Request, Response, NextFunction } from "express";
import BusTimetableService from "../services/BusTimetableService";

class BusTimetableController {
  private service = new BusTimetableService();

  async createBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createBusTimetable({ ...req.body, createdBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em createBusTimetable:", error);
      return res.status(500).json("Erro interno ao criar tabela de horário.");
    }
  }

  async updateBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.updateBusTimetable(id, { ...req.body, updatedBy: res.locals.user.userId });
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em updateBusTimetable:", error);
      return res.status(500).json("Erro interno ao atualizar tabela de horário.");
    }
  }

  async deleteBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.deleteBusTimetable(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em deleteBusTimetable:", error);
      return res.status(500).json("Erro interno ao deletar tabela de horário.");
    }
  }

  async reactivateBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.reactivateBusTimetable(id, res.locals.user.userId);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em reactivateBusTimetable:", error);
      return res.status(500).json("Erro interno ao reativar tabela de horário.");
    }
  }

  async getBusTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.service.getBusTimetable(id);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em getBusTimetable:", error);
      return res.status(500).json("Erro interno ao buscar tabela de horário.");
    }
  }

  /** POST /lookup — consulta tabelas de horário por lista de IDs (corpo `{ ids }`). */
  async lookupBusTimetables(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.getBusTimetablesByIds(req.body?.ids);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em lookupBusTimetables:", error);
      return res.status(500).json("Erro interno ao consultar tabelas de horário em lote.");
    }
  }

  async findBusTimetables(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.findBusTimetables(req.query);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Erro em findBusTimetables:", error);
      return res.status(500).json("Erro interno ao buscar tabelas de horário.");
    }
  }
}

export default BusTimetableController;
