import { Request, Response, NextFunction } from "express";
import productService from "../services/product.service";

// CREATE PRODUCT
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const response = await productService.createProduct(req.body);
  
  next(response);
};

// UPDATE PRODUCT
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.updateProduct(id, req.body);
  next(response);
};

// DELETE PRODUCT
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.deleteProduct(id);
  next(response);
};

// GET PRODUCT BY ID
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.getProductById(id);
  next(response);
};

// GET PRODUCT BY CODE
export const getProductByCode = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  const response = await productService.getProductByCode(code);
  next(response);
};

// LIST PRODUCTS WITH FILTERS + PAGINATION
export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  const response = await productService.listProducts(req.query);
  next(response);
};

// SEARCH PRODUCTS
export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  const { q, page, limit } = req.query;

  const response = await productService.searchProducts(
    String(q),
    Number(page) || 1,
    Number(limit) || 20
  );

  next(response);
};

// GET PRODUCTS BY CATEGORY
export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { category } = req.params;
  const { page, limit } = req.query;

  const response = await productService.getProductsByCategory(
    category,
    Number(page) || 1,
    Number(limit) || 20
  );

  next(response);
};

// GET PRODUCTS BY SUBCATEGORY
export const getProductsBySubcategory = async (req: Request, res: Response, next: NextFunction) => {
  const { subcategory } = req.params;
  const { page, limit } = req.query;

  const response = await productService.getProductsBySubcategory(
    subcategory,
    Number(page) || 1,
    Number(limit) || 20
  );

  next(response);
};

// STOCK QUERIES
export const getAvailableSize = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.getAvailableSize(id);
  next(response);
};

export const getProductStock = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { colorName, size } = req.query;  // FIXED: make query-based or param-based

  const response = await productService.getProductStock(
    id,
    String(colorName),
    String(size)
  );

  next(response);
};


// STOCK UPDATE
export const updateProductStock = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { colorName, size } = req.body;   // FIXED
  const { stock } = req.body;

  const response = await productService.updateProductStock(id, colorName, size, stock);
  next(response);
};


export const reduceProductStock = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { colorName, size, qty } = req.body;  // FIXED

  const response = await productService.reduceProductStock(id, colorName, size, qty);
  next(response);
};


// SUBCATEGORY OPS
export const addSubcategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { subcategory } = req.body;

  const response = await productService.addSubcategory(id, subcategory);
  next(response);
};

export const removeSubcategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { subcategory } = req.body;

  const response = await productService.removeSubcategory(id, subcategory);
  next(response);
};

export const getAllProductsLight = async ( req: Request, res: Response, next: NextFunction ) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 12, 50);

  const response = await productService.getAllProductsLight({
    page,
    limit,
  });

  next(response);
};

export const uploadAssets = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next({ status: 400, message: 'No file uploaded' });
  }

  const imageUrls = await productService.handleImageUploads({
    files: [req.file],
  });

  return res.status(200).json({
    success: true,
    images: imageUrls,
  });
};