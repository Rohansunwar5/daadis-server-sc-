import productVariantModel from '../models/productVariant.model';
import shiprocketWebhookService from './shiprocketWebhook.service';
import { ProductVariantRepository } from '../repository/productVariant.repository';

class ShiprocketSyncService {
  private readonly _variantRepository = new ProductVariantRepository();

  /**
   * Sync a single product to Shiprocket
   * 1. Assigns shiprocketVariantId to all variants (uses MongoDB _id)
   * 2. Sends product update webhook to Shiprocket
   */
  async syncProduct(productId: string) {
    // Step 1: Assign shiprocketVariantId to all variants of this product
    const { variants } = await this._variantRepository.getVariantsByProductId(productId, 1, 1000);

    for (const variant of variants) {
      if (!variant.shiprocketVariantId) {
        await productVariantModel.updateOne(
          { _id: variant._id },
          { $set: { shiprocketVariantId: variant._id.toString() } }
        );
      }
    }

    // Step 2: Send product update webhook to Shiprocket
    await shiprocketWebhookService.sendProductUpdateWebhook(productId);

    return { synced: variants.length };
  }

  /**
   * Sync ALL products to Shiprocket
   * Use this for initial catalog sync
   */
  async syncAllProducts() {
    // Get all variants that don't have shiprocketVariantId
    const unsyncedVariants = await productVariantModel.find({
      shiprocketVariantId: { $exists: false },
    });

    let syncedCount = 0;

    for (const variant of unsyncedVariants) {
      await productVariantModel.updateOne(
        { _id: variant._id },
        { $set: { shiprocketVariantId: variant._id.toString() } }
      );
      syncedCount++;
    }

    console.log(`[Shiprocket Sync] Assigned shiprocketVariantId to ${syncedCount} variants`);

    return { syncedCount };
  }

  /**
   * Check if a variant is synced with Shiprocket
   */
  async isVariantSynced(variantId: string): Promise<boolean> {
    const variant = await productVariantModel.findById(variantId);
    return !!variant?.shiprocketVariantId;
  }
}

export default new ShiprocketSyncService();