# HRMS API Documentation

Base URL: `http://localhost:5000`

All protected routes require a Bearer Token in the `Authorization` header:
`Authorization: Bearer <your_token>`

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Payload (Request Body) |
| :--- | :--- | :--- | :--- |
| **POST** | `/login` | User login | `{ "email": "user@example.com", "password": "password" }` |
| **POST** | `/register` | User registration | `{ "name": "Name", "email": "email", "phone": "+971...", "password": "...", "confirmPassword": "..." }` |
| **POST** | `/refresh` | Refresh Access Token | Cookies: `refreshToken` |
| **POST** | `/logout` | Logout | Cookies: `refreshToken` |

## 2. Employees (`/api/employees`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get all employees | Query: `?department=IT&status=Active&search=John` |
| **GET** | `/:id` | Get employee by ID | URL Param: `id` |
| **POST** | `/` | Add new employee | `{ "name": "...", "email": "...", "role": "...", "department": "...", "joinDate": "...", "basicSalary": 5000 }` |
| **PUT** | `/:id` | Update employee | `{ "phone": "...", "status": "..." }` (Partial Update) |
| **DELETE** | `/:id` | Delete employee | URL Param: `id` |

## 3. Assets (`/api/assets`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get all assets | Query: `?search=laptop` |
| **POST** | `/` | Create asset | `{ "name": "Laptop", "category": "Electronics", "location": "Office", "purchaseCost": 5000, "purchaseDate": "2024-01-01" }` |
| **POST** | `/assign` | Assign asset | `{ "assetId": "...", "employeeId": "...", "notes": "..." }` |
| **GET** | `/:id` | Get asset details | URL Param: `id` |
| **POST** | `/:id/maintenance` | Schedule Maintenance | `{ "scheduledDate": "...", "type": "Repair" }` |
| **POST** | `/:id/dispose` | Dispose Asset | `{ "reason": "Obsolete", "date": "..." }` |

## 4. Requests (`/api/requests`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **POST** | `/` | Create Request | **Leave:** `{ "requestType": "LEAVE", "details": { "leaveType": "Annual", "fromDate": "...", "toDate": "..." } }`<br>**Salary:** `{ "requestType": "SALARY", "subType": "loan", "details": { "amount": 5000, "reason": "..." } }` |
| **GET** | `/my` | Get user's requests | Query: `?type=LEAVE` |
| **GET** | `/admin/pending` | Get ALL requests (Admin) | Requires `APPROVE_REQUESTS` permission |
| **PUT** | `/:requestId/action` | Approve/Reject | `{ "action": "APPROVE" }` or `{ "action": "REJECT", "rejectionReason": "..." }` |

## 5. Attendance (`/api/attendance`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/monthly` | Monthly Attendance | Query: `?month=1&year=2024` |
| **GET** | `/` | Daily Attendance | `?date=YYYY-MM-DD` <br> `&page=1&limit=10` <br> `&status=Present` <br> `&search=Name` <br> `&department=IT` <br> `&shift=Morning` |
| **POST** | `/mark` | Mark Attendance (Admin) | `{ "employeeId": "...", "date": "...", "status": "Present", "checkIn": "09:00", "checkOut": "18:00" }` |

## 6. Payroll (`/api/payroll`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **POST** | `/generate` | Generate Payroll | `{ "month": 2, "year": 2024 }` |
| **GET** | `/summary` | Get Summary | Query: `?month=2&year=2024` |

## 7. Masters (`/api/masters`)

| Method | Endpoint | Description | Payload / Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/:type` | Get items by type | `type`: departments, roles, branches, asset-types, etc. |
| **POST** | `/:type` | Add item | `{ "name": "New Item", "description": "..." }` |

## 8. Dashboard (`/api/dashboard`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/summary` | Get admin dashboard summary statistics |
| **GET** | `/pending-approvals` | Get Pending Approvals | Returns `{ count, data: [...] }` |

## 9. System Settings (`/api/system-settings`)

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Get global settings | - |
| **PUT** | `/global` | Update global settings | `{ "companyName": "...", "fiscalYearStart": "..." }` |
| **POST** | `/holidays` | Add Holiday | `{ "name": "Eid", "date": "...", "isRecurring": true }` |

## 10. Reports (`/api/reports`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/department-attendance` | Department-wise attendance stats |
| **GET** | `/document-expiry` | List of expiring documents |
| **GET** | `/asset-depreciation` | Asset value depreciation report |
| **GET** | `/payroll-summary` | Payroll history summary |
| **POST** | `/custom` | Generate Custom Report | `{ "dataset": "employees", "columns": [...], "filters": {...} }` |

## 11. Search (`/api/search`)

| Method | Endpoint | Description | Query |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Global Search | `?q=searchterm` |

## 12. Training (`/api/trainings`)

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| **GET** | `/:employeeId` | Get trainings for employee | - |
| **POST** | `/` | Add training record | `{ "employeeId": "...", "trainingName": "...", "date": "..." }` |

## 13. Workflows (`/api/workflows`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/:employeeId/:type` | Get workflow (onboarding/offboarding) |
| **PUT** | `/:workflowId/:itemId` | Update workflow item status |

## 14. Notifications (`/api/notifications`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | Get user notifications |
| **PUT** | `/:id/read` | Mark notification as read |
