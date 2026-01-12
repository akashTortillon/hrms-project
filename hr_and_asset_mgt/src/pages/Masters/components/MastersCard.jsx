# Database Design Checklist & Questions for HR Management

This document outlines the proposed database schema changes and questions required to implement the "Rules & Configuration" features correctly.

## 1. Leave Policy (Linking Rules to Leave Types)
We need to know how complex the leave rules should be.

- [ ] **Linkage**: Should a rule be directly linked to a `Leave Type` (1-to-1) or can one rule apply to multiple types?
- [ ] **Accrual Logic**: Do we need to support detailed accrual logic?
    - *Options*: Monthly, Yearly, Upfront, Pro-rata based on joining date.
- [ ] **Carry Forward**: Do we need to store carry-forward limits (e.g., "Max 5 days carry over")?
- [ ] **Encashment**: Is leave encashment a requirement?
- [ ] **Reset Date**: Does leave balance reset on Jan 1st or the Employee's Joining Anniversary?

**Proposed Schema Fields:**
- `leaveTypeId` (Reference)
- `daysPerYear` (Number)
- `accrualFrequency` (Enum: Monthly/Yearly)
- `resetDate` (Date/String)

---

## 2. Payroll Configuration
How dynamic should the payroll formulas be?

- [ ] **Component Types**: Are we only tracking "Earnings" and "Deductions"?
    - *Examples*: Basic, HRA, Transport (Earnings) vs. Tax, PF (Deductions).
- [ ] **Calculation Basis**:
    - [ ] Fixed Amount (e.g., Transport = $500)
    - [ ] Percentage (e.g., HRA = 40% of Basic)
    - [ ] Multiplier (e.g., Overtime = 1.5x Hourly Rate)
- [ ] **Applicability**: Do rules apply globally or per Department/Grade?

**Proposed Schema Fields:**
- `name` (String)
- `type` (Earning/Deduction/Rate)
- `calculationMethod` (Fixed/Percentage/Multiplier)
- `value` (Number)

---

## 3. Workflow Templates
 Defining the approval structures.

- [ ] **Step logic**: Is a simple linear list of roles sufficient?
    - *Example*: Dept Head -> HR Manager.
- [ ] **Conditions**: Do we need conditional logic?
    - *Example*: "If leave > 5 days, require CEO approval".
- [ ] **Triggers**: What events trigger a workflow? (Leave Request, Expense Claim, Asset Request).

---

## 4. General Implementation
- [ ] **Migration**: Do we need to migrate any existing data? (Likely fresh for now).
- [ ] **UI Forms**: The "Add" modal will need to change from a simple input to a complex form based on the type selected. Is this improved UI expected immediately?

---

## 5. User Roles & Permissions
Defining how access control works.

- [ ] **Permission Granularity**: How detailed should permissions be?
    - [ ] *Module Level*: Access "HR Management" (Yes/No).
    - [ ] *Action Level*: Access "HR Management" -> Can "View", "Create", "Edit", "Delete".
- [ ] **Custom Roles**: Can users create new custom roles, or are they fixed to "Admin", "HR Manager", etc.?
- [ ] **Role Assignment**: Can one user have multiple roles?
- [ ] **Hierarchy**: Is there a hierarchy (e.g., Admin > HR Manager > Employee) where upper roles inherit lower permissions automatically?
