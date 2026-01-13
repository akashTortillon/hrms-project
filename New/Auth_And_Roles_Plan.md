# Authentication & Roles Implementation Plan

## 1. Backend Architecture

### A. Database Upgrade

1.  **Refine `User` Model** (`userModel.js`)
    *   This is distinct from `Employee`. `User` is for login access.
    *   **New Fields**:
        *   `avatar`: String (URL)
        *   `role`: Ref (Role Model)
        *   `linkedEmployeeId`: Ref (Employee) - Connects login to HR data.
        *   `lastLogin`: Date

2.  **Create `Role` Model** (`roleModel.js`)
    *   **Goal**: Dynamic Permission Management (RBAC).
    *   **Fields**:
        *   `name`: String (e.g., "HR Manager", "IT Admin", "Employee")
        *   `permissions`: Array of Strings (or JSON Object)
            *   *Example*: `['hr_view', 'hr_edit', 'payroll_approve', 'assets_view']`

### B. Middleware & Security

1.  **Enhanced `protect` Middleware**:
    *   Verify JWT (Already done).
    *   Check if User is active/banned.

2.  **`restrictTo` Middleware**:
    *   Usage: `restrictTo('hr_edit', 'admin')`
    *   Logic: Checks if `req.user.role.permissions` contains the required tag.

### C. API Endpoints (`/backend/src/routes/authRoutes.js`)

1.  **Session Management**:
    *   `POST /api/auth/login`: Returns Token + User Info + Permission List.
    *   `GET /api/auth/me`: Refreshes local user state.

2.  **Role Management**:
    *   `POST /api/roles`: Create new role definition.
    *   `GET /api/roles`: List available roles for dropdowns.

---

## 2. Frontend Integration

### A. Route Protection (`PrivateRoute.jsx`)
*   Wrap sensitive routes (like Payroll, Settings) in a Guard component.
*   Logic: `if (!user.permissions.includes('payroll_view')) return <AccessDenied />`

### B. UI Adaptation
*   **Sidebar**: Hide menu items based on permissions (e.g., Only IT Admin sees "Asset Settings").
*   **Buttons**: Disable "Delete" buttons for non-admin users.

### C. Login Page
*   Polished login screen with "Forgot Password" flow.
