import mongoose , { Document } from 'mongoose';

const sizeStockSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    }
});

const productColorSchema = new mongoose.Schema({
    colorName: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    colorHex: {
        type: String,
        required: true,
        match: /^#([0-9A-Fa-f]{6})$/,
    },
    images: [{ type: String }],
    sizeStock: [sizeStockSchema]
});

const packOptionSchema = new mongoose.Schema({
    packSize: {
        type: Number,
        required: true,
        min: 1
    },
    packPrice: {
        type: Number,
        required: true,
        min: 0
    }
});

const productBulletSchema = new mongoose.Schema({
    point: {
        type: String,
        required: true,
        trim: true,
        maxLength: 300
    },
    order: {
        type: Number,
        default: 0
    }
});

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100
        },
        productCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        originalPrice: {
            type: Number,
            min: 0
        },
        images: [{ 
            type: String,
            required: true,
        }],
        colors: [productColorSchema],
        material: {
            type: String,
            trim: true,
            maxLength: 200
        },
        productDetails: {
            type: String,
            trim: true,
            maxLength: 2000
        },
        bulletPoints: [productBulletSchema],
        category: {
            type: String,
            trim: true,
        },
        subcategory: {
            type: String,
            trim: true,
        },
        hsn: {
            type: String,
            trim: true,
        },
        packOptions: [packOptionSchema],
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

export interface ISizeStock {
    size: string;
    stock: number;
}

export interface IProductColor {
    colorName: string;
    colorHex: string;
    images: string[]; 
    sizeStock: ISizeStock[];
}

export interface IProductBullet {
    point: string;
    order: number;
}

export interface IPackOption {
    packSize: number;
    packPrice: number;
}

export interface IProduct extends Document {
    _id: string;
    name: string;
    productCode: string;
    price: number;
    originalPrice?: number;
    images: string[];               
    colors: IProductColor[];
    material?: string;
    productDetails?: string;
    bulletPoints?: IProductBullet[];
    packOptions?: IPackOption[];
    category?: string;
    subcategory?: string;
    hsn?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export default mongoose.model<IProduct>('Product', productSchema);