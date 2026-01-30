import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import config from '../config';
import cartService from './cart.service';
import { BadRequestError } from '../errors/bad-request.error';

class ShiprocketCheckoutService {
  // Always use the URL from config (production by default)
  private baseUrl = config.SHIPROCKET_BASE_URL || 'https://checkout-api.shiprocket.com';
  private apiKey = config.SHIPROCKET_API_KEY;
  private secretKey = config.SHIPROCKET_SECRET_KEY;

  private sign(payload: any): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('base64');
  }

  async generateToken(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    // ✅ SINGLE SOURCE OF TRUTH
    const { cartData } = await cartService.getCartForShiprocketCheckout({
      userId,
      sessionId,
    });

    const payload = {
      cart_data: cartData,
      redirect_url: `${config.FRONTEND_URL}/checkout/success`,
      timestamp: new Date().toISOString(),
    };

    const hmac = this.sign(payload);

    console.log('[Shiprocket Checkout] Generating token with payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/access-token/checkout`,
        payload,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'X-Api-HMAC-SHA256': hmac,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[Shiprocket Checkout] Response:', JSON.stringify(response.data, null, 2));

      const token = response.data?.result?.token;

      if (!token) {
        throw new BadRequestError('Failed to generate Shiprocket checkout token');
      }

      return token;
    } catch (error) {
      // Log the actual error response from Shiprocket
      if (error instanceof AxiosError && error.response) {
        console.error('[Shiprocket Checkout] Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: JSON.stringify(error.response.data, null, 2),
          headers: error.response.headers,
        });

        // Throw with actual error message from Shiprocket
        const shiprocketError = error.response.data?.message || error.response.data?.error || 'Unknown Shiprocket error';
        throw new BadRequestError(`Shiprocket Checkout Error: ${shiprocketError}`);
      }
      throw error;
    }
  }
}

export default new ShiprocketCheckoutService();