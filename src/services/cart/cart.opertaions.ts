import { CartItemInput, UpdateCartItemInput, CartRepository } from '../../repository/cart.repository';
import { validateProductAndVariant, resolveSelectedImage, ensureQuantityWithinStock } from './cart.validators';
import { BadRequestError } from '../../errors/bad-request.error';


export default function buildCartOperations(_cartRepository: CartRepository) {
return {
        async addItemToUserCart(userId: string, item: CartItemInput) {
            const { product, colorVariant, sizeStock } = await validateProductAndVariant(item.product, item.color.colorName, item.size);
            item.selectedImage = resolveSelectedImage(colorVariant, item.selectedImage);
            ensureQuantityWithinStock(item.quantity, sizeStock);
            const existing = await _cartRepository.checkItemExists(userId, item.product, item.color.colorName, item.size, item.packSize);
            if (existing) {
                const cartItem = await _cartRepository.getCartItem(userId, item.product, item.color.colorName, item.size, item.packSize);
                const newQty = (cartItem?.quantity || 0) + item.quantity;
                if (newQty > sizeStock.stock) throw new BadRequestError(`Only ${sizeStock.stock} available`);
                return _cartRepository.updateCartItem(userId, cartItem!._id.toString(), { quantity: newQty });
            }

            return _cartRepository.addItemToCart(userId, item);
        },


        async updateUserCartItem(userId: string, itemId: string, data: UpdateCartItemInput) {
            const cart = await _cartRepository.getCartByUserId(userId);
            if (!cart) throw new BadRequestError('Cart not found');
            const item = cart.items.find(i => i._id.toString() === itemId);
            if (!item) throw new BadRequestError('Item not found in cart');


            const targetColor = data.color || item.color;
            const targetSize = data.size || item.size;
            const targetQty = data.quantity ?? item.quantity;


            const { colorVariant, sizeStock } = await validateProductAndVariant(item.product.toString(), targetColor.colorName, targetSize);
            if (data.selectedImage) {
                data.selectedImage = resolveSelectedImage(colorVariant, data.selectedImage);
            }
            ensureQuantityWithinStock(targetQty, sizeStock);


            return _cartRepository.updateCartItem(userId, itemId, data);
        },


        async removeUserCartItem(userId: string, itemId: string) {
            return _cartRepository.removeItemFromCart(userId, itemId);
        },


        // Guest variants
        async addItemToGuestCart(sessionId: string, item: CartItemInput) {
            const { colorVariant, sizeStock } = await validateProductAndVariant(item.product, item.color.colorName, item.size);
            item.selectedImage = resolveSelectedImage(colorVariant, item.selectedImage);
            ensureQuantityWithinStock(item.quantity, sizeStock);


            const existing = await _cartRepository.getCartBySessionId(sessionId);
            const existingItem = existing?.items.find((i: any) =>
                i.product.toString() === item.product &&
                i.color.colorName === item.color.colorName &&
                i.size === item.size &&
                (item.packSize != null ? i.packSize === item.packSize : i.packSize == null)
            );
            if (existingItem) {
                const newQty = existingItem.quantity + item.quantity;
                if (newQty > sizeStock.stock) throw new BadRequestError(`Only ${sizeStock.stock} available`);
                return _cartRepository.updateCartItemBySessionId(sessionId, existingItem._id.toString(), { quantity: newQty });
            }

            return _cartRepository.addItemToCartBySessionId(sessionId, item);
        },


        async updateGuestCartItem(sessionId: string, itemId: string, data: UpdateCartItemInput) {
            const cart = await _cartRepository.getCartBySessionId(sessionId);
            if (!cart) throw new BadRequestError('Guest cart not found');
            const item = cart.items.find(i => i._id.toString() === itemId);
            if (!item) throw new BadRequestError('Item not found');


            const targetColor = data.color || item.color;
            const targetSize = data.size || item.size;
            const targetQty = data.quantity ?? item.quantity;


            const { colorVariant, sizeStock } = await validateProductAndVariant(item.product.toString(), targetColor.colorName, targetSize);
            if (data.selectedImage) {
                data.selectedImage = resolveSelectedImage(colorVariant, data.selectedImage);
            }
            ensureQuantityWithinStock(targetQty, sizeStock);


            return _cartRepository.updateCartItemBySessionId(sessionId, itemId, data);
        },


        async removeGuestCartItem(sessionId: string, itemId: string) {  
            return _cartRepository.removeItemFromCartBySessionId(sessionId, itemId);
        }
    };
}