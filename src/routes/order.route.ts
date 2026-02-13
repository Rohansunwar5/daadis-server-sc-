import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  createOrder,
  initiatePayment,
  getOrderById,
  getOrderByOrderNumber,
  getMyOrders,
  getGuestOrders,
  cancelOrder,
  updateOrderStatus,
} from '../controllers/order.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import isLoggedInOptional from '../middlewares/isLoggedInOptional.middleware';
import { createOrderValidator } from '../middlewares/validators/order.validator';

const orderRouter = Router();
orderRouter.post('/', isLoggedInOptional, createOrderValidator, asyncHandler(createOrder));
orderRouter.post('/:orderId/payment', isLoggedInOptional, asyncHandler(initiatePayment));
orderRouter.get('/:orderId', asyncHandler(getOrderById));
orderRouter.get('/number/:orderNumber', asyncHandler(getOrderByOrderNumber));
orderRouter.get('/user/my-orders', isLoggedIn, asyncHandler(getMyOrders));
orderRouter.get('/guest/:sessionId', asyncHandler(getGuestOrders));
orderRouter.post('/:orderId/cancel', isLoggedInOptional, asyncHandler(cancelOrder));
orderRouter.patch('/:orderId/status', asyncHandler(updateOrderStatus));

export default orderRouter;