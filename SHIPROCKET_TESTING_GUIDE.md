# Shiprocket Checkout - Testing Guide

Step-by-step guide to test the complete Shiprocket Checkout integration.

---

## Prerequisites

- [ ] Server running (`npm run dev`)
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] `.env` configured with real API keys
- [ ] Products exist in database with variants

---

## Phase 1: Catalog Sync APIs (Verify Shiprocket Can Fetch Your Data)

> **Goal:** Ensure Shiprocket can read your product catalog.

### Test 1.1: Fetch All Products

```bash
GET http://localhost:4010/api/v1/shiprocket/products?page=1&limit=10
```

**Expected Response:**
```json
{
  "data": {
    "total": 50,
    "products": [
      {
        "id": "...",
        "title": "Plant Name",
        "variants": [...]
      }
    ]
  }
}
```

✅ **Pass if:** Returns products with `id`, `title`, `variants`, `image`

---

### Test 1.2: Fetch All Collections

```bash
GET http://localhost:4010/api/v1/shiprocket/collections?page=1&limit=10
```

**Expected Response:**
```json
{
  "data": {
    "total": 5,
    "collections": [
      {
        "id": "...",
        "title": "Indoor Plants",
        "handle": "indoor-plants"
      }
    ]
  }
}
```

✅ **Pass if:** Returns collections with `id`, `title`, `handle`

---

### Test 1.3: Fetch Products by Collection

```bash
GET http://localhost:4010/api/v1/shiprocket/products-by-collection?collection_id=<COLLECTION_ID>&page=1&limit=10
```

✅ **Pass if:** Returns only products belonging to that collection

---

## Phase 2: Cart Operations (User Flow Begins)

> **Goal:** Prepare cart data for checkout.

### Test 2.1: Add Item to Cart

```bash
POST http://localhost:4010/api/v1/cart/add
Content-Type: application/json
Authorization: Bearer <USER_JWT>

{
  "variantId": "<VARIANT_ID>",
  "quantity": 2
}
```

✅ **Pass if:** Item added to cart, quantity updated

---

### Test 2.2: Get Cart

```bash
GET http://localhost:4010/api/v1/cart
Authorization: Bearer <USER_JWT>
```

✅ **Pass if:** Returns cart with items, prices, totals

---

## Phase 3: Checkout Token Generation

> **Goal:** Generate Shiprocket checkout token from cart.

### Test 3.1: Generate Checkout Token

```bash
POST http://localhost:4010/api/v1/checkout/shiprocket/token
Content-Type: application/json
Authorization: Bearer <USER_JWT>

{
  "userId": "<USER_ID>"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

✅ **Pass if:** Returns a valid JWT token

❌ **Common Errors:**
| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid API Key` | Wrong SHIPROCKET_API_KEY | Check `.env` |
| `Invalid HMAC` | Wrong SHIPROCKET_SECRET_KEY | Check `.env` |
| `Cart is empty` | No items in cart | Add items first |

---

## Phase 4: Frontend Checkout (Browser Test)

> **Goal:** Open Shiprocket checkout iframe and complete payment.

### Test 4.1: Open Checkout in Browser

1. Open your frontend app
2. Add items to cart
3. Click "Checkout" button
4. Shiprocket iframe should open

✅ **Pass if:** Iframe opens with your cart items

### Test 4.2: Complete Test Payment

1. Enter test shipping address
2. Select payment method (COD for testing)
3. Complete order

✅ **Pass if:** Order confirmation shown, redirected to success page

---

## Phase 5: Order Webhook Verification

> **Goal:** Verify webhook receives and processes orders.

### Test 5.1: Check Webhook Logs

After completing test order, check server logs:

```
[Shiprocket Webhook] Received order webhook: { eventType: 'ORDER_SUCCESS', orderId: '...' }
[Shiprocket Webhook] Processing order success: ...
```

### Test 5.2: Verify Order in Database

```bash
GET http://localhost:4010/api/v1/orders
Authorization: Bearer <USER_JWT>
```

✅ **Pass if:** Order appears with:
- Correct items and quantities
- Shiprocket order ID stored
- Payment status = "PAID" or "COD"

### Test 5.3: Verify Cart Cleared

```bash
GET http://localhost:4010/api/v1/cart
Authorization: Bearer <USER_JWT>
```

✅ **Pass if:** Cart is empty after successful order

---

## Phase 6: Product Sync Webhooks (Admin Flow)

> **Goal:** Verify product updates sync to Shiprocket.

### Test 6.1: Update a Product

```bash
PUT http://localhost:4010/api/v1/admin/products/<PRODUCT_ID>
Authorization: Bearer <ADMIN_JWT>

{
  "name": "Updated Plant Name",
  "price": 599
}
```

**Check server logs:**
```
[Shiprocket Webhook] Sending product update: { productId: '...' }
[Shiprocket Webhook] Product update sent successfully: 200
```

✅ **Pass if:** Webhook sent with 200 response

### Test 6.2: Create New Product

Create a new product via admin panel and verify sync webhook fires.

---

## Phase 7: Order Status Updates

> **Goal:** Verify order status updates from Shiprocket.

### Test 7.1: Simulate Status Webhook (Dev Only)

```bash
POST http://localhost:4010/webhooks/shiprocket/order
Content-Type: application/json
X-Api-HMAC-SHA256: <calculated-hmac>

{
  "order_id": "<SHIPROCKET_ORDER_ID>",
  "status": "SUCCESS",
  "shipment_status": "IN_TRANSIT"
}
```

✅ **Pass if:** Order status updated in database

---

## Quick Test Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Fetch products API works | ⬜ |
| 2 | Fetch collections API works | ⬜ |
| 3 | Add to cart works | ⬜ |
| 4 | Checkout token generated | ⬜ |
| 5 | Shiprocket iframe opens | ⬜ |
| 6 | Test order placed | ⬜ |
| 7 | Order webhook received | ⬜ |
| 8 | Order saved to database | ⬜ |
| 9 | Cart cleared after order | ⬜ |
| 10 | Product sync webhook works | ⬜ |

---

## Postman Collection

Import these as a Postman collection for easier testing:

```
Base URL: http://localhost:4010

1. GET  /api/v1/shiprocket/products
2. GET  /api/v1/shiprocket/collections
3. POST /api/v1/cart/add
4. GET  /api/v1/cart
5. POST /api/v1/checkout/shiprocket/token
6. GET  /api/v1/orders
7. POST /webhooks/shiprocket/order
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| No products returned | Products have `isActive: true`? |
| Token generation fails | API key and secret correct? |
| Iframe doesn't open | `sellerDomain` input exists? |
| Webhook not received | Server publicly accessible? |
| HMAC verification fails | Using raw body, not parsed JSON? |
