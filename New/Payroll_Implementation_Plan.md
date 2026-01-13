# Payroll Module Implementation Plan

## 1. Backend Architecture (The Engine)

The payroll system requires a robust backend to handle salary calculations, history tracking, and compliance generation (WPS).

### A. Database Schema Upgrades (`/backend/src/models`)

1.  **Modify `Employee` Model** (`employeeModel.js`)
    *   **Goal**: Store salary structures and bank info.
    *   **New Fields**:
        ```javascript
        salaryDetails: {
            basicSalary: Number,
            housingAllowance: Number,
            transportAllowance: Number,
            otherAllowances: Number,
            overtimeRate: Number
        },
        bankDetails: {
            bankName: String,
            iban: String,
            accountNumber: String,
            agentId: String // For WPS Routing
        }
        ```

2.  **Create `PayrollRun` Model** (`payrollRunModel.js`)
    *   **Goal**: Track the "Main Event" of processing a month (e.g., "October 2025 Payroll").
    *   **Fields**:
        *   `month`: String (MM-YYYY)
        *   `status`: Enum ["Draft", "Processing", "Approved", "Paid"]
        *   `totalAmount`: Number
        *   `approvedBy`: User (Reference)
        *   `generatedAt`: Date

3.  **Create `Payslip` Model** (`payslipModel.js`)
    *   **Goal**: Store the calculated result for a single employee for one month.
    *   **Fields**:
        *   `employeeId`: Reference
        *   `payrollRunId`: Reference
        *   `daysWorked`: Number
        *   `earnings`: { basic, housing, transport, overtime }
        *   `deductions`: { absence, loans, other }
        *   `netSalary`: Number

### B. API Endpoints (`/backend/src/routes/payrollRoutes.js`)

1.  **Configuration**:
    *   `GET /api/payroll/config` - Get global rules (from SystemSettings).
    *   `PUT /api/payroll/config` - Update rules.

2.  **Processing**:
    *   `POST /api/payroll/generate`
        *   *Input*: `{ month: "10-2025" }`
        *   *Logic*: Fetch all active employees -> Get attendance -> Calculate Pay -> Create Draft Payslips.
    *   `POST /api/payroll/:runId/approve` - Lock the run and mark as "Approved".

3.  **Viewing**:
    *   `GET /api/payroll/history` - List all past PayrollRuns.
    *   `GET /api/payroll/run/:runId` - Get detailed list of Payslips for a specific month.

4.  **Compliance (WPS)**:
    *   `GET /api/payroll/:runId/sif` - Generate and download the `.sif` file for the bank.

---

## 2. Frontend Integration (The Dashboard)

### A. Update `PayrollView.jsx`
1.  **Cards Section**:
    *   Wire "Total Salary" and "Pending Approvals" to live stats from `/api/payroll/stats`.
2.  **Transactions Table**:
    *   Replace hardcoded data with a `useEffect` fetch to `/api/payroll/run/latest`.
    *   Add a "Status" badge (Draft/Paid) to the table rows.

### B. New Actions / Components
1.  **"Run Payroll" Logic**:
    *   Add a button to trigger `POST /generate`.
    *   Show a loading spinner while the backend calculates.
2.  **SIF Download**:
    *   Wire the "Generate SIF" card to download the file created by the backend.

---

## 3. Workflow Summary
1.  **HR Manager** ensures Employee Salary Details are updated in the Employee profile.
2.  **HR Manager** clicks "Run Payroll" for the current month.
3.  **System** calculates salaries based on Attendance (days present).
4.  **HR Manager** reviews the "Draft" table.
5.  **HR Manager** clicks "Approve & Pay".
6.  **System** locks the record and generates the exportable WPS/SIF file.
