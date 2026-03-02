import axios, { AxiosResponse } from "axios";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { IOrder } from "../models/order.model";

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

interface IPackageDetails {
    weight: number;
    length: number;
    breadth: number;
    height: number;
}

interface IShiprocketOrderItem {
    name: string;
    sku: string;
    units: number;
    selling_price: string;
    discount: number;
    tax: number;
    hsn: string;
}

class ShiprocketService {
    private token: string | null = null;

    private calculatePackageDetails(): IPackageDetails {
        // Since the current database does not store actual weight and dimensions,
        // we use standard fallback defaults which can be adjusted in the 
        // Shiprocket dashboard if needed.
        return {
            weight: 0.5,
            length: 10,
            breadth: 10,
            height: 5
        };
    }

    private async authenticate(): Promise<void> {
        try {
            const response: AxiosResponse = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_PASSWORD
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.data?.token) {
                throw new InternalServerError('No token received from Shiprocket');
            }

            this.token = response.data.token;
        } catch (error: any) {
            throw new BadRequestError(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async createShipment(order: IOrder, userEmail?: string): Promise<any> {
        if (!this.token) {
            await this.authenticate();
        }

        try {
            const orderItems: IShiprocketOrderItem[] = [];

            for (const item of order.items) {
                // HSN is already available on the order item from the cart
                const hsn = item.hsn || "";

                orderItems.push({
                    name: item.name,
                    sku: item.productCode,
                    units: item.quantity,
                    selling_price: item.price.toFixed(2),
                    discount: 0,
                    tax: 0,
                    hsn: hsn
                });
            }

            const packageDetails = this.calculatePackageDetails();
            const formattedState = this.formatStateName(order.shippingAddress.state);
            const customerPhone = order.shippingAddress.phone || '0000000000';
            const lastName = order.shippingAddress.name.split(' ').pop() || 'Customer';

            const payload = {
                order_id: Math.random().toString(36).substring(2, 7) + "_" + order.orderNumber, // Added a random prefix just to avoid conflicts if recreating
                order_date: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
                pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
                channel_id: '',
                billing_customer_name: order.shippingAddress.name,
                billing_last_name: lastName,
                billing_address: order.shippingAddress.addressLine1,
                billing_address_2: order.shippingAddress.addressLine2 || '',
                billing_city: order.shippingAddress.city,
                billing_pincode: order.shippingAddress.pincode,
                billing_state: formattedState,
                billing_country: order.shippingAddress.country || "India",
                billing_email: userEmail || 'customer@example.com',
                billing_phone: customerPhone,
                shipping_is_billing: true,
                order_items: orderItems,
                payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
                sub_total: order.totalAmount.toFixed(2),
                length: packageDetails.length,
                breadth: packageDetails.breadth,
                height: packageDetails.height,
                weight: packageDetails.weight
            };

            const response: AxiosResponse = await axios.post(
                `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseData = response.data;

            if (responseData.success === false) {
                throw new BadRequestError(`Shiprocket API Error: ${responseData.message}`);
            }

            const shipmentData = responseData.data || responseData;

            const result = {
                order_id: shipmentData.order_id || 0,
                shipment_id: shipmentData.shipment_id || 0,
                status: shipmentData.status || 'UNKNOWN',
                status_code: shipmentData.status_code || 0,
                onboarding_completed_now: shipmentData.onboarding_completed_now || 0,
                awb_code: shipmentData.awb_code || '',
                courier_company_id: shipmentData.courier_company_id || 0,
                courier_name: shipmentData.courier_name || ''
            };

            return result;

        } catch (error: any) {
            console.error('Shiprocket shipment creation error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 401) {
                this.token = null;
                await this.authenticate();
                return this.createShipment(order, userEmail); // Retry once after re-auth
            }

            throw new BadRequestError(
                `Shiprocket shipment creation failed: ${error.response?.data?.message || error.message}`
            );
        }
    }

    private formatStateName(state: string): string {
        const stateMapping: { [key: string]: string } = {
            'KA': 'Karnataka',
            'MH': 'Maharashtra',
            'TN': 'Tamil Nadu',
            'DL': 'Delhi',
            'UP': 'Uttar Pradesh',
            'WB': 'West Bengal',
            'GJ': 'Gujarat',
            'RJ': 'Rajasthan',
            'PB': 'Punjab',
            'HR': 'Haryana',
            'BR': 'Bihar',
            'OR': 'Odisha',
            'JH': 'Jharkhand',
            'AS': 'Assam',
            'KL': 'Kerala',
            'AP': 'Andhra Pradesh',
            'TS': 'Telangana',
            'MP': 'Madhya Pradesh',
            'CG': 'Chhattisgarh'
        };

        if (state.length > 2) {
            return state;
        }

        return stateMapping[state.toUpperCase()] || state;
    }
}

export default new ShiprocketService();
