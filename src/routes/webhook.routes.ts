import { Router } from 'express';
import { handleShiprocketWebhook } from '../controllers/shiprocket.webhook.controller';

const webhookRouter = Router();

webhookRouter.post('/shiprocket', handleShiprocketWebhook);

export default webhookRouter;