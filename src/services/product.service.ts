import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";

import productRepository, {
    CreateProductParams,
    UpdateProductParams,
    ListProductsParams,
} from "../repository/product.repository";

class ProductService {
    constructor(private readonly _productRepository = productRepository) {}

    async createProduct(params: CreateProductParams) {
        const existing = await this._productRepository.getProductByCode(params.productCode);
        if (existing) throw new BadRequestError("Product with this code already exists");

        if (!params.images || params.images.length === 0) {
            throw new BadRequestError("At least one product image is required");
        }

        if (!params.colors || params.colors.length === 0) {
            throw new BadRequestError("At least one color must be provided");
        }

        for (const color of params.colors) {
            if (!color.images || color.images.length === 0) {
                throw new BadRequestError(`Color '${color.colorName}' must include at least one image`);
            }

            if (!color.sizeStock || color.sizeStock.length === 0) {
                throw new BadRequestError(`Color '${color.colorName}' must include sizeStock data`);
            }
        }

        const created = await this._productRepository.createProduct(params);
        if (!created) throw new InternalServerError("Failed to create product");

        return created;
    }

    async updateProduct(productId: string, params: UpdateProductParams) {
        const existing = await this._productRepository.getProductById(productId);
        if (!existing) throw new NotFoundError("Product not found");

        if (params.productCode && params.productCode !== existing.productCode) {
            const duplicate = await this._productRepository.getProductByCode(params.productCode);
            if (duplicate) throw new BadRequestError("Product with this code already exists");
        }

        if (params.images && params.images.length === 0) {
            throw new BadRequestError("Product must have at least one image");
        }

        if (params.colors) {
            for (const color of params.colors) {
                if (!color.colorName) {
                    throw new BadRequestError("Color name is required for each color");
                }

                if (color.images && color.images.length === 0) {
                    throw new BadRequestError(`Color '${color.colorName}' must include at least one image`);
                }

                if (color.sizeStock && color.sizeStock.length === 0) {
                    throw new BadRequestError(`Color '${color.colorName}' must include sizeStock`);
                }
            }
        }

        Object.keys(params).forEach(key => {
            if (params[key as keyof UpdateProductParams] === undefined) {
                delete params[key as keyof UpdateProductParams];
            }
        });

        const updated = await this._productRepository.updateProduct(productId, params);
        if (!updated) throw new InternalServerError("Failed to update product");

        return updated;
    }

    async deleteProduct(productId: string) {
        const deleted = await this._productRepository.deleteProduct(productId);
        if (!deleted) throw new NotFoundError("Product not found or deletion failed");

        return true;
    }

    async getProductById(id: string) {
        const product = await this._productRepository.getProductById(id);
        if (!product) throw new NotFoundError("Product not found");

        return product;
    }

    async getProductByCode(code: string) {
        const product = await this._productRepository.getProductByCode(code);
        if (!product) throw new NotFoundError("Product not found");
        return product;
    }

    async listProducts(params: ListProductsParams) {
        return this._productRepository.listProducts(params);
    }

    async searchProducts(query: string, page = 1, limit = 20) {
        if (!query) throw new BadRequestError("Search query cannot be empty");
        return this._productRepository.searchProducts(query, page, limit);
    }

    async getProductsByCategory(category: string, page = 1, limit = 20) {
        return this._productRepository.getProductsByCategory(category, page, limit);
    }

    async getProductsBySubcategory(subcategory: string, page = 1, limit = 20) {
        return this._productRepository.getProductsBySubcategory(subcategory, page, limit);
    }

    async updateProductStock(productId: string, colorName: string, size: string, stock: number) {
        if (stock < 0) throw new BadRequestError("Stock cannot be negative");

        const updated = await this._productRepository.updateProductStock(productId, colorName, size, stock);
        if (!updated) throw new BadRequestError("Failed to update product stock");

        return true;
    }

    async reduceProductStock(productId: string, colorName: string, size: string, qty: number) {
        if (qty <= 0) throw new BadRequestError("Invalid quantity");

        const updated = await this._productRepository.reduceProductStock(productId, colorName, size, qty);
        if (!updated) throw new BadRequestError("Not enough stock to reduce");

        return true;
    }

    async getAvailableSize(productId: string) {
        return this._productRepository.getAvailableSize(productId);
    }

    async getProductStock(productId: string, colorName: string, size: string) {
        const stock = await this._productRepository.getProductStock(productId, colorName, size);
        if (!stock) throw new NotFoundError("Stock not found");
        return stock;
    }

    async addSubcategory(productId: string, sub: string) {
        const ok = await this._productRepository.addSubcategory(productId, sub);
        if (!ok) throw new BadRequestError("Failed to add subcategory");
        return true;
    }

    async removeSubcategory(productId: string, sub: string) {
        const ok = await this._productRepository.removeSubcategory(productId, sub);
        if (!ok) throw new BadRequestError("Failed to remove subcategory");
        return true;
    }

    async getAllProductsLight(params: { page: number; limit: number }) {
        return this._productRepository.getAllProductsLight(params);
    }

}

export default new ProductService();