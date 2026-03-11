import { DashboardRepository } from '../repository/dashboard.repository';

export class DashboardService {
    constructor(private readonly _dashboardRepo: DashboardRepository) { }

    async getStats() {
        const totalProducts = await this._dashboardRepo.getTotalProducts();
        const totalCategories = await this._dashboardRepo.getTotalCategories();
        const totalSubcategories = await this._dashboardRepo.getTotalSubcategories();
        const totalOrders = await this._dashboardRepo.getTotalOrders();

        const year = new Date().getFullYear();
        const rawMonthlyData = await this._dashboardRepo.getMonthlyRevenue(year);
        // Format to month strings
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize all months with 0
        const monthlyDataMap = monthNames.map(month => ({ month, revenue: 0 }));
        rawMonthlyData.forEach(data => {
            const monthIndex = data._id - 1; // Mongo months are 1-12
            monthlyDataMap[monthIndex].revenue = data.revenue;
        });

        const rawDailyData = await this._dashboardRepo.getDailySales(7);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Generate last 7 days starting from today backwards to maintain order
        const dailyDataArray = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const _id = d.getDay() + 1; // Mongo $dayOfWeek is 1 for Sunday, 2 for Monday
            const dayName = dayNames[d.getDay()];

            const match = rawDailyData.find(r => r._id === _id);
            dailyDataArray.push({
                day: dayName,
                sales: match ? match.sales : 0
            });
        }

        const rawStatusCounts = await this._dashboardRepo.getOrderStatusCounts();
        const orderStatusCounts = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
        };
        rawStatusCounts.forEach((stat: any) => {
            if (Object.keys(orderStatusCounts).includes(stat._id)) {
                orderStatusCounts[stat._id as keyof typeof orderStatusCounts] = stat.count;
            }
        });

        const recentOrdersRaw = await this._dashboardRepo.getRecentOrders(5);
        const recentOrders = recentOrdersRaw.map(order => ({
            id: order.orderNumber,
            customer: order.shippingAddress.name,
            product: order.items.map(i => i.name).join(', '),
            amount: order.totalAmount,
            status: order.status
        }));

        return {
            mainStats: [
                { label: 'Total Categories', value: totalCategories, icon: 'Tag', gradient: 'from-purple-500 to-indigo-500' },
                { label: 'Total Subcategories', value: totalSubcategories, icon: 'Grid3X3', gradient: 'from-blue-500 to-cyan-500' },
                { label: 'Total Products', value: totalProducts, icon: 'Package', gradient: 'from-rose-500 to-pink-500' },
                { label: 'Total Orders', value: totalOrders, icon: 'ShoppingBag', gradient: 'from-green-500 to-emerald-500' },
            ],
            orderStatusCounts,
            recentOrders,
            monthlyData: monthlyDataMap,
            dailyData: dailyDataArray
        };
    }
}

export default new DashboardService(new DashboardRepository());
