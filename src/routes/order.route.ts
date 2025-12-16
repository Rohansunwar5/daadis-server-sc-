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

const orderRouter = Router();
orderRouter.post('/',  asyncHandler(createOrder));
orderRouter.post('/:orderId/payment', asyncHandler(initiatePayment));
orderRouter.get('/:orderId', asyncHandler(getOrderById));
orderRouter.get('/number/:orderNumber', asyncHandler(getOrderByOrderNumber));
orderRouter.get('/user/my-orders', isLoggedIn, asyncHandler(getMyOrders));
orderRouter.get('/guest/:sessionId', asyncHandler(getGuestOrders));
orderRouter.post('/:orderId/cancel', asyncHandler(cancelOrder));
orderRouter.patch('/:orderId/status', asyncHandler(updateOrderStatus));

export default orderRouter;