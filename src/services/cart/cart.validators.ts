
import { BadRequestError } from '../../errors/bad-request.error';
import { NotFoundError } from '../../errors/not-found.error';
import productService from '../product.service';


export async function validateProductAndVariant(productId: string, colorName: string, size: string) {
if (!productId) throw new BadRequestError('Product id is required');


const product = await productService.getProductById(productId);
if (!product || !product.isActive) throw new NotFoundError('Product not found or inactive');


const colorVariant = product.colors.find((c: any) => c.colorName === colorName);
if (!colorVariant) throw new BadRequestError('Selected color is not available for this product');


const sizeStock = colorVariant.sizeStock.find((s: any) => s.size === size);
if (!sizeStock) throw new BadRequestError('Selected size is not available for this color');


return { product, colorVariant, sizeStock };
}


export function resolveSelectedImage(colorVariant: any, selectedImage?: string): string {
    const colorImages: string[] = Array.isArray(colorVariant.images) ? colorVariant.images : [];

    // If provided image already belongs to this color variant, keep it
    if (selectedImage && colorImages.includes(selectedImage)) {
        return selectedImage;
    }

    // Otherwise auto-pick the first image of the selected color
    if (colorImages.length > 0) {
        return colorImages[0];
    }

    // Last resort: use whatever was sent (could be a product-level image)
    if (selectedImage) return selectedImage;

    throw new BadRequestError('No image available for the selected color');
}


export function ensureQuantityWithinStock(quantity: number, sizeStock: any) {
if (quantity <= 0) throw new BadRequestError('Quantity must be greater than zero');
if (quantity > sizeStock.stock) throw new BadRequestError(`Only ${sizeStock.stock} available`);
}