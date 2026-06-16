import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController = {
  async summary(_req: Request, res: Response) {
    const data = await dashboardService.summary();
    return res.json(data);
  },
};
