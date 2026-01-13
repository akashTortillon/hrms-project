# Master Project Checklist: Design & Logic Implementation

This interactive checklist tracks every Design and Logic component required to complete the HR & Asset Management System.

## 🟢 Module 1: Masters & Configuration
*   **Design (UI)**
    *   [ ] **Workflow Builder UI**: Drag-and-drop or step-builder for approval chains.
    *   [ ] **Payroll Formula Builder UI**: Interface to define Salary/Overtime rules.
    *   [ ] **Asset Depreciation Rules UI**: Settings for asset value loss.
*   **Logic (Backend)**
    *   [ ] **RBAC Guard**: `protect(admin-only)` middleware for all Master routes.
    *   [ ] **Rule Engine**: Backend processing for custom Formulas & Workflows.

## 🟡 Module 2: Employee Management
*   **Design (UI)**
    *   [ ] **Add Employee Wizard**: Multi-step Modal (Personal -> Job -> Money -> Docs).
    *   [ ] **Employee Profile View**: Tabbed page (Overview, Documents, Assets, Salary).
*   **Logic (Backend)**
    *   [ ] **Schema Upgrade**: Add `salaryDetails`, `bankDetails`, `documentLinks`.
    *   [ ] **Dynamic Dropdowns**: Fetch Dept/Role/Designation from Masters DB.
    *   [ ] **Document Expiry**: Auto-calculate expiry alerts.

## 🔴 Module 3: Authentication & Security
*   **Design (UI)**
    *   [ ] **Role Manager**: Grid to toggle permissions (e.g. `[x] Can View Salary`).
    *   [ ] **Access Denied Page**: Friendly 403 error screen.
*   **Logic (Backend)**
    *   [ ] **Role Model**: Database schema for Roles & Permissions.
    *   [ ] **Permission Middleware**: `restrictTo('permission_name')` logic.

## 🔴 Module 4: Attendance
*   **Design (UI)**
    *   [ ] **Monthly Calendar**: Visual grid of Present/Absent/Late.
    *   [ ] **My Attendance**: Widget for employees to check stats.
    *   [ ] **Shift Planner**: Admin UI to assign shifts.
*   **Logic (Backend)**
    *   [ ] **Time Engine**: Calculate "Hours Worked" from Check-in/out.
    *   [ ] **Late Detection**: Auto-flag "Late" based on Shift Start Time.

## 🔴 Module 5: Leave Management
*   **Design (UI)**
    *   [ ] **Apply Leave Modal**: Date picker with holiday exclusion.
    *   [ ] **Manager Dashboard**: "Pending Approvals" list.
    *   [ ] **Balance View**: "You have 12 Annual days left" widget.
*   **Logic (Backend)**
    *   [ ] **Accrual Engine**: Auto-add leave days monthly.
    *   [ ] **Balance Check**: Prevent applying if balance is 0.
    *   [ ] **Workflow Trigger**: Route request to Manager defined in Workflow Rules.

## 🔴 Module 6: Asset Management
*   **Design (UI)**
    *   [ ] **Asset Inventory Table**: Rich filter (Status, Category, Location).
    *   [ ] **Assignment Modal**: "Assign to Employee" with date tracker.
    *   [ ] **My Assets**: Employee view of held items.
*   **Logic (Backend)**
    *   [ ] **Inventory Model**: Schema for `Asset` tracking.
    *   [ ] **Lifecycle Logic**: `Purchase -> Allocate -> Return -> Scrap`.
    *   [ ] **Request Workflow**: Employee requests -> IT approves -> Assigned.

## 🔴 Module 7: Payroll
*   **Design (UI)**
    *   [ ] **Payroll Wizard**: Step-by-step monthly processing.
    *   [ ] **Payslip Template**: Printable component.
*   **Logic (Backend)**
    *   [ ] **Calculation Engine**: The core math (`Salary - Absence + Overtime`).
    *   [ ] **WPS/SIF Generator**: Bank compliance file creation.
    *   [ ] **Payslip PDF**: PDF Generation service.

## 🔴 Module 8: Document Management
*   **Design (UI)**
    *   [ ] **Document Vault**: Folder view for Company vs Employee docs.
    *   [ ] **Expiry Timeline**: Visual timeline of upcoming expiries.
*   **Logic (Backend)**
    *   [ ] **File Upload**: Multer/S3 service for storing files.
    *   [ ] **Expiry Job**: Cron job to check dates and send emails.
