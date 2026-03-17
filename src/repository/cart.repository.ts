import mongoose from "mongoose";
import cartModel from "../models/cart.model";
import { DiscountCalculationResult } from "./discount.repository";

export interface CartItemInput {
  product: string;
  quantity: number;
  size: string;
  color: {
    colorName: string;
    colorHex: string;
  };
  selectedImage: string;
  packSize?: number | null;
  packPrice?: number | null;
}

export interface UpdateCartItemInput {
  quantity?: number;
  size?: string;
  color?: {
    colorName: string;
    colorHex: string;
  };
  selectedImage?: string;
  packSize?: number | null;
  packPrice?: number | null;
}

export interface ApplyDiscountInput {
  code: string;
  type: 'coupon' | 'voucher'; 
}

export interface RemoveDiscountInput {
  type: 'coupon' | 'voucher' | 'all';
}

export class CartRepository {
    private _model = cartModel

    async getCartByUserId(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async createCart(userId: string) {
        return this._model.create({ user: userId, items: [] }); 
    }

    async addItemToCart(userId: string, item: CartItemInput) {
        const packQuery: any = {
            user: userId,
            'items.product': item.product,
            'items.color.colorName': item.color.colorName,
            'items.size': item.size,
        };
        if (item.packSize != null) {
            packQuery['items.packSize'] = item.packSize;
        } else {
            packQuery['items.packSize'] = { $in: [null, undefined] };
        }
        const exisitngCart = await this._model.findOne(packQuery);

        if(exisitngCart) {
            return this.updateExistingCartItem(userId, item);
        }

        return this._model.findOneAndUpdate(
            { user: userId },
            { $push: { items: item }},
            { new: true, upsert:true }
        )
    }

    private async updateExistingCartItem(userId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { 
                user: userId,
                'items.product': item.product,
                'items.color.colorName': item.color.colorName,
                'items.size': item.size
            },
            { 
                $inc: { 'items.$.quantity': item.quantity },
                $set: { 'items.$.addedAt': new Date() }
            },
            { new: true }
        );
    }

    async updateCartItem(userId: string, itemId: string, updateData: UpdateCartItemInput) {
        const update: any = { 
            'items.$.addedAt': new Date() // Use addedAt instead of updatedAt as per schema
        };
        
        if (updateData.quantity !== undefined) {
            update['items.$.quantity'] = updateData.quantity;
        }
        if (updateData.size !== undefined) {
            update['items.$.size'] = updateData.size;
        }
        if (updateData.color !== undefined) {
            update['items.$.color'] = updateData.color;
        }
        if (updateData.selectedImage !== undefined) {
            update['items.$.selectedImage'] = updateData.selectedImage;
        }

        return this._model.findOneAndUpdate(
            { user: userId, 'items._id': itemId },
            { $set: update },
            { new: true }
        );
    }

    async removeItemFromCart(userId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        );
    }

    async getCartBySessionId(sessionId: string) {
        return this._model.findOne({ sessionId, isActive: true });
    }

    async createGuestCart(sessionId: string) {
        return this._model.create({ 
            sessionId, 
            items: [], 
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
        });
    }

    async getOrCreateGuestCart(sessionId: string) {
        let cart = await this.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this.createGuestCart(sessionId);
        }
        return cart;
    }

    async applyDiscount(userId: string, type: 'coupon' | 'voucher', result: DiscountCalculationResult) {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { 
                $set: { 
                    [updateField]: {
                        code: result.appliedDiscount.code,
                        discountId: result.appliedDiscount.discountId,
                        discountAmount: result.discountAmount
                    }
                } 
            },
            { new: true }
        );
    }

    // NEW: apply discount for guest cart by sessionId
    async applyDiscountBySessionId(sessionId: string, type: 'coupon' | 'voucher', result: DiscountCalculationResult) {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';

        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { 
                $set: { 
                    [updateField]: {
                        code: result.appliedDiscount.code,
                        discountId: result.appliedDiscount.discountId,
                        discountAmount: result.discountAmount
                    }
                } 
            },
            { new: true }
        );
    }

    async clearCartItems(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
    }

    async deleteCart(userId: string) {
        return this._model.findOneAndDelete({ user: userId });
    }

    async clearDiscount(userId: string, type: 'coupon' | 'voucher') {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { $unset: { [updateField]: 1 } },
            { new: true }
        );
    }

    async replaceCartItems(userId: string, items: CartItemInput[]) {
        return cartModel.findOneAndUpdate(
            { user: userId },
            { $set: { items } },
            { new: true, upsert: true }
        ).populate('items.product');
    }

    async addItemToCartBySessionId(sessionId: string, item: CartItemInput) {
        const exisitngCart = await this._model.findOne({
            sessionId,
            isActive: true,
            'items.product': item.product,
            'items.color.colorName': item.color.colorName,
            'items.size': item.size
        })

        if(exisitngCart) {
            return this.updateExistingCartItemBySessionId(sessionId, item);
        }

        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $push: { items: item } },
            { new: true, upsert: true }
        )
    }

    private async updateExistingCartItemBySessionId(sessionId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { 
                sessionId,
                isActive: true,
                'items.product': item.product,
                'items.color.colorName': item.color.colorName,
                'items.size': item.size
            },
            { 
                $inc: { 'items.$.quantity': item.quantity },
                $set: { 'items.$.addedAt': new Date() }
            },
            { new: true }
        );
    }

    async updateCartItemBySessionId(sessionId: string, itemId: string, updateData: UpdateCartItemInput) {
        const update: any = { 
            'items.$.addedAt': new Date() 
        };
        
        if (updateData.quantity !== undefined) {
            update['items.$.quantity'] = updateData.quantity;
        }
        if (updateData.size !== undefined) {
            update['items.$.size'] = updateData.size;
        }
        if (updateData.color !== undefined) {
            update['items.$.color'] = updateData.color;
        }
        if (updateData.selectedImage !== undefined) {
            update['items.$.selectedImage'] = updateData.selectedImage;
        }

        return this._model.findOneAndUpdate(
            { sessionId, 'items._id': itemId, isActive: true },
            { $set: update },
            { new: true }
        );
    }

    async removeItemFromCartBySessionId(sessionId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        );
    }

    async transferGuestCartToUser(sessionId: string, userId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { 
                $set: { user: new mongoose.Types.ObjectId(userId) },
                $unset: { sessionId: 1 }
            },
            { new: true }
        );
    }
    
    async deleteGuestCart(sessionId: string) {
        return this._model.findOneAndDelete({ sessionId, isActive: true });
    }

    async removeDiscount(userId: string, type: 'coupon' | 'voucher' | 'all') {
        const updateFields: any = {};
        
        if (type === 'coupon' || type === 'all') {
            updateFields.appliedCoupon = 1;
        }
        
        if (type === 'voucher' || type === 'all') {
            updateFields.appliedVoucher = 1;
        }
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { $unset: updateFields },
            { new: true }
        );
    }

    async clearGuestDiscount(sessionId: string, type: 'coupon'|'voucher'|'all') {
        const update: any = {};

        if (type === 'coupon' || type === 'all') {
            update.appliedCoupon = "";
        }
        if (type === 'voucher' || type === 'all') {
            update.appliedVoucher = "";
        }

        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $unset: update },
            { new: true }
        );
    }


    async checkItemExists(userId: string, productId: string, colorName: string, size: string, packSize?: number | null) {
        const query: any = {
            user: userId,
            'items.product': productId,
            'items.color.colorName': colorName,
            'items.size': size,
        };
        if (packSize != null) {
            query['items.packSize'] = packSize;
        } else {
            query['items.packSize'] = { $in: [null, undefined] };
        }
        return this._model.findOne(query);
    }

    async getCartItem(userId: string, productId: string, colorName: string, size: string, packSize?: number | null) {
        const query: any = {
            user: userId,
            'items.product': productId,
            'items.color.colorName': colorName,
            'items.size': size,
        };
        if (packSize != null) {
            query['items.packSize'] = packSize;
        } else {
            query['items.packSize'] = { $in: [null, undefined] };
        }
        const cart = await this._model.findOne(query);

        if (!cart) return null;

        const item = cart.items.find(item =>
            item.product.toString() === productId &&
            item.color.colorName === colorName &&
            item.size === size &&
            (packSize != null ? (item as any).packSize === packSize : (item as any).packSize == null)
        );

        return item || null;
    }

    async clearGuestCartItems(sessionId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { 
                $set: { 
                    items: [],
                    appliedCoupon: undefined,
                    appliedVoucher: undefined
                } 
            },
            { new: true }
        );
    }
}
