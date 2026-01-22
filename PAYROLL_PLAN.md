# Payroll Implementation Plan (Aligned with SRS Rules)

## Objective
Implement a comprehensive payroll system that integrates **Leave Accruals (Annual/Sick/Maternity)** and a robust **Payroll Engine (Basic + Allowances + Deductions + Loans)**, ensuring full **WPS Compliance**.

## Phase 1: Configuration (Masters & Rules)

### 1. Leave Rules Configuration (`Master` type: `LEAVE_TYPE`)
Define specific rules for each leave type as per SRS:
- **Fields in Metadata**:
  - `maxDaysPerYear`: Number (e.g., 30 for Annual).
  - `accrualRate`: Number (e.g., 2.5 days/month).
  - `accrualFrequency`: "MONTHLY" | "YEARLY".
  - `eligibilityMonths`: Number (e.g., must work 6 months before use).
  - `isPaid`: Boolean (True for Annual/Sick, False for Unpaid).
  - `carryForwardLimit`: Number.

### 2. Payroll Rules Configuration (`Master` type: `PAYROLL_COMPONENT`)
Define salary components based on SRS requirements:
- **Allowances**:
  - House Rent Allowance (HRA)
  - Transport Allowance
  - Phone/Bills Allowance
- **Deductions**:
  - Unpaid Leave Deduction (Auto-calculated from Attendance).
  - Loan Repayment (Integrated with Loan module).
  - Penalties/Violations.
- **Overtime Rules**:
  - `OT_RATE_NORMAL`: 1.25x
  - `OT_RATE_HOLIDAY`: 1.5x

## Phase 2: Logic Engine Implementation

### 1. Leave Logic
- **Accrual Engine**: A background job or on-demand check that calculates: `(MonthsWorked * AccrualRate) - LeavesTaken = Balance`.
- **Payroll Integration**: When generating payroll, check if taken leave was `isPaid`. If `False`, apply deduction.

### 2. Payroll Logic
- **Base Formula**: `(Basic + Fixed Allowances)`.
- **Variable Add-ons**: `(OvertimeHours * BasicRate * Multiplier)`.
- **Deductions**:
  - `Absent Days` (Unexcused).
  - `Unpaid Leave` (Approved but unpaid).
  - `Loan Installment` (If active loan exists).

## Phase 3: Frontend Integration

### 1. Payroll View
- **Summary Cards**: Total Basic, Total Allowances, Total Deductions, WPS Net (matches SRS).
- **Processing Table**:
  - Columns: Basic | Allowances | OT | Deductions (Loans/Leaves) | Net Pay.
  - "Import Attendance" triggers the `Absent/Unpaid Leave` calculation.

### 2. WPS Compliance Tools
- **SIF Generation**: Automate the creation of the `.sif` file with strict formatting:
  - `EmployerID, BankCode, FileCreationDate, SalaryMonth`.
  - `EmployeeID, DaysWorked, NetSalary, LeaveDays`.

## Phase 4: Execution Plan
1. **Seed Masters**: Create the SRS-defined Leave Types and Payroll Components.
2. **Backend**: Build the `Payroll` model and `generatePayroll` engine.
3. **Frontend**: Connect UI to backend.
