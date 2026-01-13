# HR Management Implementation Plan

## 1. Backend Architecture

### A. Database Models (`/backend/src/models`)

1.  **Refine `Employee` Model** (`employeeModel.js`)
    *   **Goal**: Comprehensive profile management.
    *   **Fields**:
        *   `personalInfo`: { dob, nationality, gender, maritalStatus }
        *   `contactInfo`: { address, emergencyContact }
        *   `employmentDetails`: {
            joiningDate,
            confirmationDate,
            designation (Ref to Master),
            department (Ref to Master),
            manager (Ref to User/Employee)
        }
        *   `documents`: Array of { type (Ref), url, expiryDate }

2.  **Create `LeaveApplication` Model** (`leaveModel.js`)
    *   **Goal**: Track leave requests and approvals.
    *   **Fields**:
        *   `employeeId`: Ref
        *   `leaveType`: Ref (Master)
        *   `startDate`: Date
        *   `endDate`: Date
        *   `daysCount`: Number
        *   `reason`: String
        *   `status`: Enum [Pending, Approved, Rejected]
        *   `approvedBy`: Ref
        *   `attachments`: Array

3.  **Create `Attendance` Model** (`attendanceModel.js`)
    *   **Goal**: Daily logs.
    *   **Fields**:
        *   `employeeId`: Ref
        *   `date`: Date
        *   `checkIn`: Time
        *   `checkOut`: Time
        *   `status`: Enum [Present, Absent, Late, HalfDay]

### B. API Endpoints (`/backend/src/routes/hrRoutes.js`)

1.  **Employee Lifecycle**:
    *   `POST /api/employees` - Onboard new employee (Multi-step form data).
    *   `PUT /api/employees/:id/documents` - Upload IDs/Passports.
    *   `GET /api/employees/expiring-docs` - For dashboard alerts.

2.  **Leave Management**:
    *   `POST /api/leaves/apply` - Submit request.
    *   `GET /api/leaves/pending` - For Managers/HR.
    *   `PUT /api/leaves/:id/status` - Approve/Reject.

3.  **Attendance**:
    *   `POST /api/attendance/check-in` - Real-time punch.
    *   `POST /api/attendance/bulk-upload` - Upload biometric device logs (CSV).

---

## 2. Frontend Integration

### A. Employee Directory
*   **Grid View**: Cards showing photo, name, designation.
*   **Profile View**: Tabbed interface (Overview, specific Documents, Leave History).
*   **Document Warning**: Red badge on profiles with expiring documents.

### B. Leave Portal
*   **Calendar View**: Visual representation of "Who is off today".
*   **Apply Modal**: Date picker with automatic day calculation excluding weekends/holidays.

### C. Dashboard Widgets
*   **"On Leave Today"**: List of absent employees.
*   **"Expiring Passports"**: Critical alerts list.
