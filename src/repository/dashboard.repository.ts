import orderModel from '../models/order.model';
import productModel from '../models/product.model';
import categoryModel from '../models/category.model';
import subcategoryModel from '../models/subcategory.model';

export class DashboardRepository {
    async getTotalProducts() {
        return productModel.countDocuments();
    }

    async getTotalCategories() {
        return categoryModel.countDocuments();
    }

    async getTotalSubcategories() {
        return subcategoryModel.countDocuments();
    }

    async getTotalOrders() {
        return orderModel.countDocuments();
    }

    async getMonthlyRevenue(year: number) {
        // Aggregation to get monthly revenue for the given year
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        return orderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear },
                    status: { $nin: ['cancelled', 'failed'] } // Only successful orders
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    }

    async getDailySales(days: number = 7) {
        const date = new Date();
        date.setDate(date.getDate() - days);

        return orderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: date },
                    status: { $nin: ['cancelled', 'failed'] }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" }, // 1 is Sunday, 2 is Monday, etc.
                    sales: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    }

    async getOrderStatusCounts() {
        return orderModel.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
    }

    async getRecentOrders(limit: number = 5) {
        return orderModel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('orderNumber shippingAddress.name items totalAmount status createdAt paymentMethod');
    }
}
