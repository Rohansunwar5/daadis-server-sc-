import { CartRepository } from '../../repository/cart.repository';
import productService from '../product.service';


export default function buildSummary(cartRepo: CartRepository) {
return {
        async calculateCartTotal(cart: any) {
        if (!cart || !cart.items || !cart.items.length) return { subtotal: 0, discountAmount: 0, total: 0, items: 0 };


        const productIds = cart.items.map((i:any) => i.product.toString());
        const products = await Promise.all(productIds.map((id:string) => productService.getProductById(id)));
        const productMap = products.reduce((acc:any, p:any) => { if (p) acc[p._id.toString()] = p; return acc; }, {});


        const subtotal = cart.items.reduce((sum: number, it: any) => {
        if (!it.product || !it.quantity) return sum;
        const p = productMap[it.product.toString()];
        if (!p) return sum;
        const unitPrice = it.packPrice != null ? it.packPrice : p.price;
        return sum + unitPrice * it.quantity;
        }, 0);

        const discountAmount = (cart.appliedCoupon?.discountAmount || 0) + (cart.appliedVoucher?.discountAmount || 0);
        return { subtotal, discountAmount, total: Math.max(0, subtotal - discountAmount), items: cart.items.length };
        },


        async buildCartDetails(cart: any) {
        const totals = await this.calculateCartTotal(cart);
        const productIds = cart.items.map((i:any) => i.product.toString());
        const products = await Promise.all(productIds.map((id:string) => productService.getProductById(id)));
        const productMap = products.reduce((acc:any, p:any) => { if (p) acc[p._id.toString()] = p; return acc; }, {});


        const items = cart.items
        .filter((it: any) => {
            return (
            it.product &&
            it.quantity &&
            it.size &&
            it.color &&
            it.color.colorName &&
            it.color.colorHex
            );
        })
        .map((it: any) => {
            const p = productMap[it.product.toString()];

            const unitPrice = it.packPrice != null ? it.packPrice : (p ? p.price : 0);
            return {
            _id: it._id,
            product: p
                ? {
                    _id: p._id,
                    name: p.name,
                    price: p.price,
                    images: p.images,
                }
                : null,
            quantity: it.quantity,
            size: it.size,
            color: it.color,
            selectedImage: it.selectedImage,
            packSize: it.packSize ?? null,
            packPrice: it.packPrice ?? null,
            addedAt: it.addedAt,
            itemTotal: p ? unitPrice * it.quantity : 0,
            };
        });

        ;


        return { cart: { _id: cart._id, user: cart.user, appliedCoupon: cart.appliedCoupon, appliedVoucher: cart.appliedVoucher }, items, totals: { subtotal: totals.subtotal, discountAmount: totals.discountAmount, total: totals.total, itemCount: totals.items } };
        }
    };
}