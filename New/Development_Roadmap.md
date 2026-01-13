# Development Roadmap & Dependency Chain

This roadmap outlines the critical path for development. Dependencies must be satisfied in this order to ensure data integrity (e.g., you cannot run payroll without attendance records).

## 🟢 Phase 1: Foundation (Complete)
* **Goal**: Static Data Management.
* **Component**: **Masters & System Settings**.
* **Status**: ✅ **DONE**. Creates Departments, Designations, Asset Types, and Global Configs.
* **Why**: Every other module requires these dropdowns to be populated.

---

## 🟡 Phase 2: Core Actors (Current Focus)
* **Goal**: Onboarding People.
* **Component**: **Employee Management**.
* **Dependencies**: Needs `Departments` & `Designations` from Phase 1.
* **Tasks**:
    1.  Upgrade `Employee` Model with `salaryDetails` and `bankDetails` (Critical for Payroll).
    2.  Build Profile Management UI.

---

## 🟡 Phase 3: Access Control
* **Goal**: Security & Self-Service.
* **Component**: **Authentication & Roles**.
* **Dependencies**: Needs `Employees` from Phase 2.
* **Tasks**:
    1.  Implement Login (JWT).
    2.  Create `User` model linked to `Employee`.
    3.  Implement Role-Based Access (e.g., Employees can only see their own data).

---

## 🟠 Phase 4: Daily Operations (The "Inputs")
* **Goal**: Tracking Activity.
* **Component**: **Attendance & Leaves**.
* **Dependencies**: Needs `Employees` (Phase 2) and `Login` (Phase 3).
* **Tasks**:
    1.  **Attendance**: Build Check-in/Check-out API.
    2.  **Leaves**: Build Leave Request & Approval workflow.
* **Why**: Payroll calculation requires these records to exist.

---

## 🔴 Phase 5: Financial Processing (The "Outputs")
* **Goal**: Salary Calculation.
* **Component**: **Payroll**.
* **Dependencies**: Needs `Employees` (Salary info from Phase 2) and `Attendance/Leaves` (Presence info from Phase 4).
* **Blocker**: **Cannot start until Phase 4 is stable**.
* **Tasks**:
    1.  Build Cancellation Engine (Salary / 30 * Days Worked).
    2.  Generate Payslips.
    3.  Generate WPS/SIF Files.

---

## 🔵 Phase 6: Asset Management (Standalone)
* **Goal**: Inventory Tracking.
* **Dependencies**: Needs `Masters` (Phase 1) and `Employees` (Phase 2, for assignment).
* **Status**: Can be developed in parallel with Phase 4 or 5.
* **Tasks**:
    1.  Inventory CRUD.
    2.  Asset Request & Allocation Workflow.

---

## Summary of Execution Order:
1.  **Masters** (Done)
2.  **Employees** (Primary Data)
3.  **Auth** (Security)
4.  **Attendance/Leaves** (Data Accumulation)
5.  **Payroll** (Processing)
6.  **Assets** (Parallel Track)
