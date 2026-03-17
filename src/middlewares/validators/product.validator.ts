import { validateRequest } from "."; 
import { 
    isRequired, 
    isNumeric, 
    isBoolean, 
    isArray, 
    isStringOrArrayOfString 
} from "../../utils/validator.utils";

export const createProductValidator = [
    isRequired("name"),
    isRequired("productCode"),

    isNumeric("price"),
    isNumeric("originalPrice", true),

    // product images
    isArray("images"),

    // colors array required
    isArray("colors"),

    // color fields
    isRequired("colors.*.colorName"),
    isRequired("colors.*.colorHex"),
    isArray("colors.*.images"),
    isArray("colors.*.sizeStock"),

    // sizeStock fields
    isRequired("colors.*.sizeStock.*.size"),
    isNumeric("colors.*.sizeStock.*.stock"),

    // optional text fields
    isStringOrArrayOfString("material", true),
    isStringOrArrayOfString("productDetails", true),

    // bulletPoints
    isArray("bulletPoints", true),

    // optional pack options
    isArray("packOptions", true),
    isNumeric("packOptions.*.packSize", true),
    isNumeric("packOptions.*.packPrice", true),

    // optional category
    isStringOrArrayOfString("category", true),
    isStringOrArrayOfString("subcategory", true),
    isStringOrArrayOfString("hsn", true),

    isBoolean("isActive", true),

    ...validateRequest
];

export const updateProductValidator = [
    isStringOrArrayOfString("name", true),
    isStringOrArrayOfString("productCode", true),

    isNumeric("price", true),
    isNumeric("originalPrice", true),

    isArray("images", true),
    isArray("colors", true),

    // If colors array exists, validate deeper
    isStringOrArrayOfString("colors.*.colorName", true),
    isStringOrArrayOfString("colors.*.colorHex", true),
    isArray("colors.*.images", true),
    isArray("colors.*.sizeStock", true),

    isStringOrArrayOfString("material", true),
    isStringOrArrayOfString("productDetails", true),
    isArray("bulletPoints", true),

    isArray("packOptions", true),
    isNumeric("packOptions.*.packSize", true),
    isNumeric("packOptions.*.packPrice", true),

    isStringOrArrayOfString("category", true),
    isStringOrArrayOfString("subcategory", true),
    isStringOrArrayOfString("hsn", true),

    isBoolean("isActive", true),

    ...validateRequest
];

export const updateStockValidator = [
    isRequired("colorName"),
    isRequired("size"),
    isNumeric("stock"),
    ...validateRequest
];

export const reduceStockValidator = [
    isRequired("colorName"),
    isRequired("size"),
    isNumeric("qty"),
    ...validateRequest
];

export const searchProductValidator = [
    isRequired("q", true),
    ...validateRequest
];
