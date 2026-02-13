import { PaymentRepository } from '../repository/payment.repository';
import { OrderRepository } from '../repository/order.repository';
import razorpayService from './razorpay.service';
import config from '../config';
import { NotFoundError } from '../errors/not-found.error';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';

class PaymentService {
  constructor(
    private readonly _paymentRepo: PaymentRepository,
    private readonly _orderRepo: OrderRepository
  ) { }

  async createPayment(params: {
    orderId: string;
    orderNumber: string;
    userId?: string;
    sessionId?: string;
    provider: string;
    amount: number;
    method?: string;
    status?: string;
    razorpayOrderId?: string;
  }) {
    const payment = await this._paymentRepo.createPayment({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      userId: params.userId,
      sessionId: params.sessionId,
      provider: params.provider,
      amount: params.amount,
      method: params.method,
    });

    // If razorpayOrderId provided, update it
    if (params.razorpayOrderId) {
      await this._paymentRepo.updatePayment(payment._id, {
        razorpayOrderId: params.razorpayOrderId,
      });
    }

    // If status is completed (COD), mark it right away
    if (params.status === 'completed') {
      await this._paymentRepo.markPaymentCompleted(
        payment._id,
        `cod_${payment._id}`, // COD transaction ID
        undefined,
        'cod',
        undefined
      );
    }

    // Link payment to order
    await this._orderRepo.updateOrderPaymentId(params.orderId, payment._id);

    return payment;
  }

  /**
   * COD Payment Flow
   * Creates a completed payment record and confirms the order immediately.
   */
  async processCodPayment(orderId: string) {
    const order = await this._orderRepo.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if payment already exists
    const existingPayment = await this._paymentRepo.getPaymentByOrderId(orderId);
    if (existingPayment) {
      throw new BadRequestError('Payment already exists for this order');
    }

    // Create COD payment record (immediately completed)
    const payment = await this.createPayment({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      sessionId: order.sessionId,
      provider: 'cod',
      amount: order.totalAmount,
      method: 'cod',
      status: 'completed',
    });

    // Confirm the order
    await this._orderRepo.updateOrderStatus({
      orderId: order._id,
      status: 'confirmed',
      paymentStatus: 'completed',
    });

    return payment;
  }

  /**
   * Razorpay Payment Flow
   * Creates a Razorpay order, stores the razorpayOrderId, and returns
   * the details needed for the frontend Razorpay checkout modal.
   * 
   * Razorpay order statuses: created → attempted → paid
   * Razorpay payment statuses: created → authorized → captured / failed
   */
  async initiateRazorpayPayment(orderId: string) {
    const order = await this._orderRepo.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if payment already exists
    let payment = await this._paymentRepo.getPaymentByOrderId(orderId);

    if (payment && payment.razorpayOrderId) {
      // Return existing Razorpay order details for retry
      return {
        paymentId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayKeyId: config.RAZORPAY_KEY_ID,
        amount: order.totalAmount * 100, // paise
        currency: 'INR',
        orderNumber: order.orderNumber,
      };
    }

    try {
      // Create Razorpay order (amount in paise)
      const razorpayOrder = await razorpayService.createOrder(
        order._id,
        order.totalAmount * 100, // Convert to paise
        'INR',
        { orderNumber: order.orderNumber }
      );

      // Create payment record
      payment = await this.createPayment({
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        sessionId: order.sessionId,
        provider: 'razorpay',
        amount: order.totalAmount,
        razorpayOrderId: razorpayOrder.id,
      });

      // Update order status to payment_pending
      await this._orderRepo.updateOrderStatus({
        orderId: order._id,
        status: 'payment_pending',
        paymentStatus: 'pending',
      });

      return {
        paymentId: payment._id,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: config.RAZORPAY_KEY_ID,
        amount: order.totalAmount * 100,
        currency: 'INR',
        orderNumber: order.orderNumber,
      };
    } catch (error: any) {
      console.error('Razorpay payment initiation error:', error);
      throw new InternalServerError('Failed to initiate Razorpay payment');
    }
  }

  /**
   * Verify Razorpay Payment
   * After the frontend Razorpay checkout modal completes, verify the signature
   * and confirm the order.
   * 
   * Razorpay sends: razorpay_order_id, razorpay_payment_id, razorpay_signature
   */
  async verifyRazorpayPayment(params: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    // Verify signature
    const isValid = await razorpayService.verifyPaymentSignature(
      params.razorpayOrderId,
      params.razorpayPaymentId,
      params.razorpaySignature
    );

    if (!isValid) {
      throw new BadRequestError('Invalid payment signature');
    }

    // Find payment by razorpayOrderId
    const payment = await this._paymentRepo.getPaymentByRazorpayOrderId(params.razorpayOrderId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Idempotency check
    if (payment.status === 'completed') {
      return payment;
    }

    // Mark payment as completed
    const updatedPayment = await this._paymentRepo.markPaymentCompleted(
      payment._id,
      params.razorpayPaymentId,        // transactionId
      params.razorpayOrderId,           // gatewayTransactionId
      'razorpay',                        // method
      { razorpaySignature: params.razorpaySignature }
    );

    // Confirm the order
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'confirmed',
      paymentStatus: 'completed',
    });

    return updatedPayment;
  }

  async handlePaymentSuccess(params: {
    checkoutId?: string;
    transactionId: string;
    gatewayTransactionId?: string;
    orderNumber?: string;
    method?: string;
    amount?: number;
    webhookData?: any;
  }) {
    let payment;

    if (params.checkoutId) {
      payment = await this._paymentRepo.getPaymentByCheckoutId(params.checkoutId);
    } else if (params.orderNumber) {
      const order = await this._orderRepo.getOrderByOrderNumber(params.orderNumber);
      if (order) {
        payment = await this._paymentRepo.getPaymentByOrderId(order._id);
      }
    } else if (params.transactionId) {
      payment = await this._paymentRepo.getPaymentByTransactionId(params.transactionId);
    }

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Idempotency check - if already completed, return
    if (payment.status === 'completed') {
      return payment;
    }

    // Mark payment as completed
    const updatedPayment = await this._paymentRepo.markPaymentCompleted(
      payment._id,
      params.transactionId,
      params.gatewayTransactionId,
      params.method,
      params.webhookData
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'confirmed',
      paymentStatus: 'completed',
    });

    return updatedPayment;
  }

  async handlePaymentFailure(params: {
    checkoutId?: string;
    transactionId?: string;
    orderNumber?: string;
    errorCode?: string;
    errorMessage?: string;
    failureReason?: string;
    webhookData?: any;
  }) {
    let payment;

    if (params.checkoutId) {
      payment = await this._paymentRepo.getPaymentByCheckoutId(params.checkoutId);
    } else if (params.orderNumber) {
      const order = await this._orderRepo.getOrderByOrderNumber(params.orderNumber);
      if (order) {
        payment = await this._paymentRepo.getPaymentByOrderId(order._id);
      }
    } else if (params.transactionId) {
      payment = await this._paymentRepo.getPaymentByTransactionId(params.transactionId);
    }

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Mark payment as failed
    const updatedPayment = await this._paymentRepo.markPaymentFailed(
      payment._id,
      params.errorCode,
      params.errorMessage,
      params.failureReason,
      params.webhookData
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'payment_failed',
      paymentStatus: 'failed',
    });

    return updatedPayment;
  }

  async getPaymentById(paymentId: string) {
    const payment = await this._paymentRepo.getPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this._paymentRepo.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found for this order');
    }
    return payment;
  }

  async initiateRefund(params: {
    paymentId: string;
    refundAmount: number;
    refundTransactionId?: string;
  }) {
    const payment = await this._paymentRepo.getPaymentById(params.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestError('Can only refund completed payments');
    }

    if (params.refundAmount > payment.amount) {
      throw new BadRequestError('Refund amount cannot exceed payment amount');
    }

    // Initiate refund
    const updatedPayment = await this._paymentRepo.initiateRefund(
      payment._id,
      params.refundAmount,
      params.refundTransactionId
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'refunded',
      paymentStatus: 'refunded',
    });

    return updatedPayment;
  }

  async retryPayment(orderId: string) {
    const payment = await this._paymentRepo.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === 'completed') {
      throw new BadRequestError('Payment already completed');
    }

    // Reset payment status to pending
    await this._paymentRepo.updatePaymentStatus({
      paymentId: payment._id,
      status: 'pending',
    });

    // Return existing checkout URL if available
    if (payment.checkoutUrl) {
      return {
        checkoutUrl: payment.checkoutUrl,
        paymentId: payment._id,
      };
    }

    throw new BadRequestError('No checkout URL available for retry');
  }
}

export default new PaymentService(
  new PaymentRepository(),
  new OrderRepository()
);