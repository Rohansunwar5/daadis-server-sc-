# Shiprocket Checkout API Reference

Complete API documentation for Shiprocket Checkout integration.

---

## Authentication

All API requests use **HMAC-SHA256** authentication:

```
X-Api-Key: Bearer <SHIPROCKET_API_KEY>
X-Api-HMAC-SHA256: <calculated-hmac-using-secret-key-and-request-body>
```

### Generating HMAC

```typescript
import crypto from 'crypto';

const hmac = crypto
  .createHmac('sha256', SHIPROCKET_SECRET_KEY)
  .update(JSON.stringify(requestBody))
  .digest('base64');
```

---

## 1. Catalog Sync APIs (Hosted by You)

> **These endpoints are called BY Shiprocket** to sync your product catalog.

### 1.1 Fetch Products

**Endpoint:** `GET /api/v1/shiprocket/products`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 100) |
| `collection_id` | string | Optional filter by collection |

**Response:**
```json
{
  "data": {
    "total": 150,
    "products": [
      {
        "id": "product_id",
        "title": "Plant Name",
        "body_html": "<p>Description</p>",
        "vendor": "Daadis",
        "product_type": "Indoor Plants",
        "handle": "plant-slug",
        "status": "active",
        "created_at": "2025-01-28T10:00:00Z",
        "updated_at": "2025-01-28T10:00:00Z",
        "image": { "src": "https://..." },
        "variants": [
          {
            "id": "variant_id",
            "title": "Small / Green",
            "price": "499.00",
            "quantity": 50,
            "sku": "PLT-001-SM",
            "weight": 0.5,
            "hsn": "0602",
            "image": { "src": "https://..." }
          }
        ]
      }
    ]
  }
}
```

---

### 1.2 Fetch Collections

**Endpoint:** `GET /api/v1/shiprocket/collections`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 100) |

**Response:**
```json
{
  "data": {
    "total": 10,
    "collections": [
      {
        "id": "collection_id",
        "title": "Indoor Plants",
        "body_html": "<p>Description</p>",
        "handle": "indoor-plants",
        "image": { "src": "https://..." },
        "created_at": "2025-01-28T10:00:00Z",
        "updated_at": "2025-01-28T10:00:00Z"
      }
    ]
  }
}
```

---

### 1.3 Fetch Products by Collection

**Endpoint:** `GET /api/v1/shiprocket/products-by-collection`

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection_id` | string | **Required** - Collection ID |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 100) |

---

## 2. Checkout APIs (Shiprocket)

> **Base URL:** `https://checkout-api.shiprocket.com`

### 2.1 Generate Checkout Token

**Endpoint:** `POST /api/v1/access-token/checkout`

**Internal Route:** `POST /api/v1/checkout/shiprocket/token`

**Request:**
```json
{
  "cart_data": {
    "items": [
      { "variant_id": "123456789", "quantity": 2 }
    ]
  },
  "redirect_url": "https://your-site.com/checkout/success",
  "timestamp": "2025-01-28T10:00:00Z"
}
```

**Response:**
```json
{
  "result": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.2 Fetch Order Details

**Endpoint:** `POST /api/v1/custom-platform-order/details`

**Request:**
```json
{
  "order_id": "659fc40044f41a36bf1c556c",
  "timestamp": "2025-01-28T10:00:00Z"
}
```

---

## 3. Webhook APIs

### 3.1 Product Update Webhook (You → Shiprocket)

**Endpoint:** `POST https://checkout-api.shiprocket.com/wh/v1/custom/product`

**Triggered:** When product is created/updated in your system

**Payload:**
```json
{
  "id": "product_id",
  "title": "IPod Nano - 8GB",
  "body_html": "<p>Description</p>",
  "vendor": "Daadis",
  "product_type": "Indoor Plants",
  "updated_at": "2025-01-28T10:00:00Z",
  "status": "active",
  "variants": [...],
  "image": { "src": "https://..." }
}
```

---

### 3.2 Collection Update Webhook (You → Shiprocket)

**Endpoint:** `POST https://checkout-api.shiprocket.com/wh/v1/custom/collection`

**Triggered:** When category is created/updated

**Payload:**
```json
{
  "id": "collection_id",
  "updated_at": "2025-01-28T10:00:00Z",
  "title": "Indoor Plants",
  "body_html": "<p>Description</p>",
  "image": { "src": "https://..." }
}
```

---

### 3.3 Order Webhook (Shiprocket → You)

**Endpoint:** `POST /webhooks/shiprocket/order`

**Triggered:** When order is placed via Shiprocket Checkout

**Payload:**
```json
{
  "order_id": "659fc40044f41a36bf1c556c",
  "cart_data": {
    "items": [{ "variant_id": "123", "quantity": 1 }]
  },
  "status": "SUCCESS",
  "phone": "9999999999",
  "email": "customer@example.com",
  "payment_type": "CASH_ON_DELIVERY",
  "total_amount_payable": 499.00,
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address1": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  }
}
```

**Status Values:**
| Status | Description |
|--------|-------------|
| `SUCCESS` | Order placed successfully |
| `FAILED` | Payment failed |
| `CANCELLED` | Order cancelled |
| `INITIATED` | Checkout started (no order yet) |

---

## 4. Environment Variables

```env
# Shiprocket Checkout Credentials
SHIPROCKET_API_KEY=your_api_key
SHIPROCKET_SECRET_KEY=your_secret_key

# Shiprocket Shipping Credentials
SHIPROCKET_EMAIL=your_email
SHIPROCKET_PASSWORD=your_password
SHIPROCKET_PICKUP_PINCODE=560040
SHIPROCKET_PICKUP_LOCATION=warehouse

# URLs
SHIPROCKET_BASE_URL=https://checkout-api.shiprocket.com
FRONTEND_URL=https://your-frontend.com
BACKEND_URL=https://your-backend.com
```

---

## 5. Error Codes

| Code | Meaning |
|------|---------|
| 401 | Invalid API Key or HMAC signature |
| 400 | Invalid request payload |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Shiprocket server error |
