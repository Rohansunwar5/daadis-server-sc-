import { Request, Response, NextFunction } from "express";
import adminAuthService from "../services/adminAuth.service";
import shiprocketSyncService from "../services/shiprocketSync.service";

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const response = await adminAuthService.login({ email, password });

    next(response);
}

export const adminSignup = async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, phoneNumber, email, password } = req.body;
    const response = await adminAuthService.signup({ firstName, lastName, phoneNumber, email, password });

    next(response);
}

export const adminProfile = async (req: Request, res: Response, next: NextFunction) => {
    const { _id } = req.admin;
    const response = await adminAuthService.profile(_id);

    next(response);
}

export const generateResetPasswordLink = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const response = await adminAuthService.login(email);

    next(response);
}

export const verifyResetPasswordCode = async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.body;
    const response = await adminAuthService.verifyResetPasswordCode(code);

    next(response);
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.body;
    const { password } = req.body;
    const response = await adminAuthService.resetPassword(code, password);

    next(response);
}

export const syncProductToShiprocket = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const result = await shiprocketSyncService.syncProduct(productId);

    next({ message: 'Product synced with Shiprocket', data: result });
}

export const syncAllProductsToShiprocket = async (req: Request, res: Response, next: NextFunction) => {
    const result = await shiprocketSyncService.syncAllProducts();

    next({ message: 'All products synced with Shiprocket', data: result });
}