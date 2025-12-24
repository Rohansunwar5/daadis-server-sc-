import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { createProductValidator, updateProductValidator, searchProductValidator, updateStockValidator, reduceStockValidator } from "../middlewares/validators/product.validator";
import { createProduct, updateProduct, deleteProduct, getProductById, getProductByCode, listProducts, searchProducts, getProductsByCategory, getProductsBySubcategory, getAvailableSize, getProductStock, updateProductStock, reduceProductStock, addSubcategory, removeSubcategory, getAllProductsLight, uploadAssets } from "../controllers/product.controllers";
import { uploadImage } from "../middlewares/multer.middleware";

const productRouter = Router();

productRouter.post( "/", isAdminLoggedIn, createProductValidator, asyncHandler(createProduct));
productRouter.put( "/:id", isAdminLoggedIn, updateProductValidator, asyncHandler(updateProduct));
productRouter.delete( "/:id", isAdminLoggedIn, asyncHandler(deleteProduct));
productRouter.patch( "/:id/stock/update", isAdminLoggedIn, updateStockValidator, asyncHandler(updateProductStock));
productRouter.patch( "/:id/stock/reduce", isAdminLoggedIn, reduceStockValidator, asyncHandler(reduceProductStock));
productRouter.post( "/:id/subcategory", isAdminLoggedIn, asyncHandler(addSubcategory));
productRouter.delete( "/:id/subcategory", isAdminLoggedIn, asyncHandler(removeSubcategory));
productRouter.get("/:id", asyncHandler(getProductById));
productRouter.get("/code/:code", asyncHandler(getProductByCode));
productRouter.get("/", asyncHandler(listProducts));
productRouter.get( "/search/query", searchProductValidator, asyncHandler(searchProducts));
productRouter.get( "/category/:category", asyncHandler(getProductsByCategory));
productRouter.get( "/subcategory/:subcategory", asyncHandler(getProductsBySubcategory));
productRouter.get( "/:id/available-sizes", asyncHandler(getAvailableSize));
productRouter.get( "/:id/stock", asyncHandler(getProductStock));
productRouter.get( "/public/light", asyncHandler(getAllProductsLight));
productRouter.post( "/upload/assets", isAdminLoggedIn, uploadImage, asyncHandler(uploadAssets));

export default productRouter;