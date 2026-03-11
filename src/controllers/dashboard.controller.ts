import { Request, Response, NextFunction } from "express";
import dashboardService from "../services/dashboard.service";

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    const response = await dashboardService.getStats();
    next({ data: response, statusCode: 200, success: true });
}
