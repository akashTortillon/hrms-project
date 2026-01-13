# Asset Management Implementation Plan

## 1. Backend Architecture

### A. Database Models (`/backend/src/models`)

1.  **Create `Asset` Model** (`assetModel.js`)
    *   **Goal**: Inventory tracking.
    *   **Fields**:
        *   `tagId`: String (Unique Barcode/QR)
        *   `name`: String
        *   `category`: Ref (Master)
        *   `type`: Ref (Master)
        *   `vendor`: Ref (Master)
        *   `purchaseDate`: Date
        *   `warrantyExpiry`: Date
        *   `cost`: Number
        *   `status`: Enum [Available, Allocated, InMaintenance, Scrapped]
        *   `assignedTo`: Ref (Employee) - Null if unassigned
        *   `history`: Array of { event, date, assignedTo, notes }

2.  **Create `AssetRequest` Model** (`assetRequestModel.js`)
    *   **Goal**: Workflow for procuring/assigning new assets.
    *   **Fields**:
        *   `requestedBy`: Ref (Employee)
        *   `assetType`: Ref (Master)
        *   `priority`: Enum [Low, Medium, High]
        *   `reason`: String
        *   `status`: Enum [Pending, Approved, Fulfilled, Rejected]

3.  **Create `MaintenanceLog` Model**
    *   **Goal**: Track repairs.
    *   **Fields**:
        *   `assetId`: Ref
        *   `serviceType`: Ref (Master)
        *   `cost`: Number
        *   `vendor`: Ref (Master)
        *   `completionDate`: Date

### B. API Endpoints (`/backend/src/routes/assetRoutes.js`)

1.  **Inventory Operations**:
    *   `POST /api/assets` - Register new asset.
    *   `PUT /api/assets/:id/allocate` - Assign to employee (updates status and history).
    *   `PUT /api/assets/:id/return` - Employee returns asset (back to inventory).

2.  **Lifecycle**:
    *   `GET /api/assets/warranty-expiring` - For dashboard alerts.
    *   `POST /api/assets/maintenance` - Log a repair.

3.  **Requests**:
    *   `POST /api/asset-requests` - Employee asks for a laptop.
    *   `PUT /api/asset-requests/:id/fulfill` - IT Admin assigns an asset to close the request.

---

## 2. Frontend Integration

### A. Asset List View
*   **Filter Bar**: Advanced filtering by Category, Status (Available vs Allocated), and Vendor.
*   **Actions**: " Allocate" button on available assets; "Check-in" button on allocated assets.

### B. Employee Asset View
*   Inside the **Employee Profile**, show a list of "Currently Held Assets".

### C. Request Portal
*   **"My Requests"**: Table showing status of user's applications.
*   **"Approvals"**: Admin view to authorize purchases or allocation.
