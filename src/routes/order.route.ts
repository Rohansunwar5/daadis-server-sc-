import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  updateTrackingInfo,
  cancelOrder,
} from '../controllers/order.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import { cancelOrderValidator, updateOrderStatusValidator } from '../middlewares/validators/order.validator';


const orderRouter = Router();

orderRouter.get('/', isLoggedIn, asyncHandler(getUserOrders));
orderRouter.get('/:orderId', isLoggedIn, asyncHandler(getOrderById));
orderRouter.patch('/:orderId/status', isLoggedIn, updateOrderStatusValidator, asyncHandler(updateOrderStatus));
orderRouter.patch('/:orderId/tracking', isLoggedIn, asyncHandler(updateTrackingInfo));
orderRouter.post('/:orderId/cancel', isLoggedIn, cancelOrderValidator, asyncHandler(cancelOrder));

export default orderRouter;