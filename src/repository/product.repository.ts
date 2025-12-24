import mongoose from 'mongoose';
import productModel, { IProduct } from '../models/product.model';

export interface CreateProductParams {
    name: string;
    productCode: string;
    price: number;
    originalPrice?: number;
    images: string[]; 
    colors: {
        colorName: string;
        colorHex: string;
        images?: string[];
        sizeStock: { size: string; stock: number }[];
    }[];
    material?: string;
    productDetails?: string;
    bulletPoints?: { point: string; order?: number }[];
    category?: string;
    subcategory?: string;
    hsn?: string;
    isActive?: boolean;
}

export interface UpdateProductParams extends Partial<CreateProductParams> {}

export interface ListProductsParams {
    page?: number;
    limit?: number;
    category?: string;
    subcategory?: string;
    search?: string;
    onlyActive?: boolean;
}
class ProductRepository {
    private _model = productModel;

    async createProduct(params: CreateProductParams) {
        return this._model.create(params);
    }

    async updateProduct(productId: string, updateData: UpdateProductParams) {
        return this._model
            .findByIdAndUpdate(productId, { $set: updateData }, { new: true })
            .lean();
    }

    async updateProductStock(productId: string, colorName: string, size: string, stock: number) {
        const res = await this._model.updateOne(
            { _id: new mongoose.Types.ObjectId(productId) },
            {
                $set: {
                    "colors.$[c].sizeStock.$[s].stock": stock
                }
            },
            {
                arrayFilters: [
                    { "c.colorName": colorName },
                    { "s.size": size }
                ]
            }
        );

        return res.modifiedCount > 0;
    }

    async reduceProductStock(productId: string, colorName: string, size: string, qty: number) {
        const result = await this._model.updateOne(
            { _id: new mongoose.Types.ObjectId(productId) },
            {
                $inc: {
                    "colors.$[c].sizeStock.$[s].stock": -qty
                }
            },
            {
                arrayFilters: [
                    { "c.colorName": colorName },
                    { "s.size": size, "s.stock": { $gte: qty } }
                ]
            }
        );

        return result.modifiedCount > 0;
    }

    async getProductById(id: string) {
        return this._model.findById(id).lean();
    }

    async getProductByCode(code: string) {
        return this._model.findOne({ productCode: code.toUpperCase() }).lean();
    }

    async listProducts(params: ListProductsParams = {}) {
        const { page = 1, limit = 20, category, subcategory, search, onlyActive = true } = params;

        const match: any = {};
        if (onlyActive) match.isActive = true;
        if (category) match.category = category;
        if (subcategory) match.subcategory = subcategory;

        if (search) {
            match.$or = [
                { name: { $regex: search, $options: "i" } },
                { productDetails: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const pipeline: any[] = [
            { $match: match },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: "count" }]
                }
            }
        ];

        const res = await this._model.aggregate(pipeline);
        const data = res[0]?.data ?? [];
        const total = res[0]?.total?.[0]?.count ?? 0;

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async searchProducts(query: string, page = 1, limit = 20) {
        return this.listProducts({
            search: query,
            page,
            limit,
            onlyActive: true
        });
    }

    async addSubcategory(productId: string, sub: string) {
        const result = await this._model.updateOne(
            { _id: productId },
            { $addToSet: { subcategory: sub } }
        );

        return result.modifiedCount > 0;
    }

    async removeSubcategory(productId: string, sub: string) {
        const result = await this._model.updateOne(
            { _id: productId },
            { $pull: { subcategory: sub } }
        );

        return result.modifiedCount > 0;
    }

    async getAvailableSize(productId: string) {
        const pipeline: any[] = [
            { $match: { _id: new mongoose.Types.ObjectId(productId), isActive: true } },
            { $unwind: "$colors" },
            { $unwind: "$colors.sizeStock" },
            { $match: { "colors.sizeStock.stock": { $gt: 0 } } },
            {
                $group: {
                    _id: "$colors.sizeStock.size",
                    totalStock: { $sum: "$colors.sizeStock.stock" }
                }
            },
            { $project: { _id: 0, size: "$_id", totalStock: 1 } },
            { $sort: { size: 1 } }
        ];

        return this._model.aggregate(pipeline as any[]);
    }

    async getProductStock(productId: string, colorName: string, size: string) {
        const pipeline: any[] = [
            { $match: { _id: new mongoose.Types.ObjectId(productId) } },
            { $unwind: "$colors" },
            { $unwind: "$colors.sizeStock" },
            {
                $match: {
                    "colors.colorName": colorName,
                    "colors.sizeStock.size": size
                }
            },
            { $project: { _id: 0, stock: "$colors.sizeStock.stock" } },
            { $limit: 1 }
        ];

        const result = await this._model.aggregate(pipeline as any[]);
        return result[0] ?? null;
    }

    async deleteProduct(productId: string) {
        const result = await this._model.deleteOne({
            _id: new mongoose.Types.ObjectId(productId)
        });

        return result.deletedCount === 1;
    }

    async getAllProductsLight(params: { page: number; limit: number }) {
        return this.listProductsLight(params);
    }

    async getProductsByCategory(category: string, page = 1, limit = 20) {
        return this.listProductsLight({ category, page, limit });
    }

    async getProductsBySubcategory(subcategory: string, page = 1, limit = 20) {
        return this.listProductsLight({ subcategory, page, limit });
    }


    async listProductsLight(params: { category?: string; subcategory?: string; page: number; limit: number; }) {
        const { category, subcategory, page, limit } = params;
        const skip = (page - 1) * limit;

        const match: any = { isActive: true };
        if (category) match.category = category;
        if (subcategory) match.subcategory = subcategory;

        const [result] = await this._model.aggregate([
            { $match: match },

            {
            $facet: {
                data: [
                {
                    $project: {
                    _id: 1,
                    name: 1,
                    images: 1,
                    price: 1,
                    originalPrice: 1,
                    category: 1,
                    subcategory: 1,
                    },
                },
                { $skip: skip },
                { $limit: limit },
                ],
                totalCount: [{ $count: 'count' }],
            },
            },
        ]);

        const total = result.totalCount[0]?.count || 0;

        return {
            data: result.data,
            meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            },
        };
    }

}

export default new ProductRepository();