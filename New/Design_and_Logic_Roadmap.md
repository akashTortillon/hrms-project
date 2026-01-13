# Comprehensive Development Roadmap: Design & Logic Needs

This document outlines every module where **New UI Designs** or **New Backend Logic** is required.

---

## 🟡 Module 1: Masters & Config
*   **Status**: ⚠️ **Logic Incomplete**
*   **Design Needs**:
    *   **Workflow Editor**: A drag-and-drop or step-builder for approval chains.
    *   **Payroll Formula Builder**: A UI to set calculation rules.
*   **Logic Needs**:
    *   **RBAC**: Restrict access so ONLY Admins can Edit/Delete masters.

---

## 🟢 Module 8: Document Management (Quick Win)
*   **Status**: ❌ **Missing**
*   **Doubt Clearance**: *Can we do this first?* **YES**. Company Documents are independent.
*   **Execution Strategy**:
    *   **Phase A (Company Docs)**: Build Upload Service (`multer`) immediately. No Employee dependency.
    *   **Phase B (Employee Docs)**: Link to Employee Profiles later.
*   **Design Needs**:
    *   **Document Vault UI**: File explorer view.
    *   **Upload Widget**: Drag-and-drop zone.
*   **Logic Needs**:
    *   **File Storage**: Saving physical files to disk.

---

## � Module 7: Asset Management (Quick Win)
*   **Status**: ❌ **Missing**
*   **Doubt Clearance**: *Can we do this first?* **YES**. Inventory is independent.
*   **Execution Strategy**:
    *   **Phase A (Inventory)**: Build CRUD for "Add Laptop". Store Serial #, Cost, Category.
    *   **Phase B (Assignment)**: Link "Assign to Employee" later.
*   **Design Needs**:
    *   **Asset Inventory Table**: Rich filter (Status, Category, Location).
    *   **Depreciation View**: Chart showing asset value loss over time.
*   **Logic Needs**:
    *   **Inventory Model**: Schema for `Asset` tracking.

---

## �🟡 Module 2: Employee Management (Critical)
*   **Status**: ⚠️ **Basic (Needs Overhaul)**
*   **Design Needs**:
    *   **New "Add Employee" Wizard**: A multi-tab modal (Personal, Employment, Financial, Documents).
*   **Logic Needs**:
    *   **Schema Update**: Storing Salary, Bank Details.

---

## 🔴 Module 3: Authentication & Roles
*   **Status**: ⚠️ **Logic Missing**
*   **Design Needs**: 
    *   **Role Management Page**: UI to toggle permissions.
*   **Logic Needs**:
    *   **Permission Guard**: Middleware.

---

## 🔴 Module 4: Attendance & Shifts
*   **Status**: ⚠️ **UI Only (Skin)**
*   **Design Needs**:
    *   **Attendance Calendar**: Visual grid of Present/Absent.
*   **Logic Needs**:
    *   **Time Engine**: Calculate "Hours Worked".

---

## 🔴 Module 5: Leaves & Policies
*   **Status**: ❌ **Missing**
*   **Design Needs**:
    *   **Apply Leave Modal**: Date picker with balance check.
*   **Logic Needs**:
    *   **Balance Engine**: Auto-deducting days.

---

## 🔴 Module 6: Payroll (The End Goal)
*   **Status**: ❌ **Missing**
*   **Design Needs**:
    *   **Payroll Wizard**: Monthly processing steps.
*   **Logic Needs**:
    *   **Calculation Engine**: `(Base + Allow) - Deductions`.
    *   **WPS Generator**: Creating `.sif` files (Requires Bank Details).

---

## 📜 Summary of New Work Required

| Component | UI Design Needed? | Backend Logic Needed? | Priority |
|---|---|---|---|
| **Document Vault** | ✅ YES | ✅ YES (Upload System) | 🟢 **Quick Win** |
| **Asset Inventory** | ✅ YES | ✅ YES (CRUD Logic) | 🟢 **Quick Win** |
| **Add Employee Form** | ✅ YES (Multi-step) | ✅ YES (Schema Update) | 🔥 **High** |
| **Payroll Engine** | ✅ YES | ✅ YES (Calc Engine) | 🔴 **Critical** |

