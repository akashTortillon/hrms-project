# Recommended Payroll Rules for Testing

This document outlines a set of payroll rules designed to test every aspect of your dynamic payroll engine. Using these rules will verify that fixed allowances, percentage calculations, and attendance-based logic (Overtime, Late, Absences) are working correctly.

## 1. Standard Allowances (Fixed & Percentage)
*These rules test basic salary additions that apply to everyone automatically.*

### A. House Rent Allowance (HRA)
*Tests percentage-based calculations based on Basic Salary.*
- **Rule Name**: HRA
- **Category**: Allowance
- **Trigger Basis**: None (Fixed / Flat)
- **Calculation Type**: Percentage (%)
- **Base**: Basic Salary
- **Value**: `40` (40% of Basic)
- **Is Automatic**: Yes

### B. Transport Allowance
*Tests fixed amount additions.*
- **Rule Name**: Transport Allowance
- **Category**: Allowance
- **Trigger Basis**: None (Fixed / Flat)
- **Calculation Type**: Fixed Amount
- **Value**: `500` (500 Flat Amount)
- **Is Automatic**: Yes

---

## 2. Dynamic Earnings (Attendance Based)
*These rules test if the system correctly converts time logs (like "8h 45m") into paid amounts.*

### C. Standard Overtime
*Tests the conversion of extra hours into pay at a standard 1.0x rate.*
- **Rule Name**: Standard Overtime
- **Category**: Allowance
- **Trigger Basis**: Overtime Hours
- **Calculation Type**: Hourly (x Multiplier)
- **Value**: `1.0` (Pays 1 hour salary for 1 hour OT)
- **Is Automatic**: Yes

### D. Holiday / Double OT (Optional)
*Tests if the multiplier logic works (e.g., paying double for specific hours).*
- **Rule Name**: Premium Overtime
- **Category**: Allowance
- **Trigger Basis**: Overtime Hours
- **Calculation Type**: Hourly (x Multiplier)
- **Value**: `1.5` (Pays 1.5x hourly rate)
- **Note**: Currently, the system aggregates all OT into one bucket. Use this *instead* of Standard Overtime if you want to test higher rates, or creating a separate shift logic later.

---

## 3. Dynamic Deductions (Penalties)
*These rules test if the system correctly penalizes late marks and absences.*

### E. Late Deduction (Half Day Penalty)
*Tests "Daily Rate" calculations triggered by an event count.*
- **Rule Name**: Late Penalty
- **Category**: Deduction
- **Trigger Basis**: Late Count
- **Calculation Type**: Daily Rate (x Days)
- **Value**: `0.5` (Deducts 0.5 days of salary per Late Mark)
- **Is Automatic**: Yes

### F. Loss of Pay (LOP) / Absenteeism
*Tests full day deductions for implicit or explicit absence.*
- **Rule Name**: Unpaid Leave Deduction
- **Category**: Deduction
- **Trigger Basis**: Absent Days
- **Calculation Type**: Daily Rate (x Days)
- **Value**: `1.0` (Deducts 1 full day salary per Absent Day)
- **Is Automatic**: Yes

---

## 4. Testing Checklist
After creating these rules, run the payroll for a test month (e.g., Nov 2025) and verify:

1.  **HRA**: Is it exactly 40% of the employee's Basic Salary?
2.  **Transport**: Is exactly 500 added?
3.  **Late**: If an employee was late 2 times, is the deduction = `(Basic / 30) * 0.5 * 2`?
4.  **Overtime**: If an employee worked 10 hours (Shift 9h), did they get paid for 1 hour at `(Basic / 30 / 9)`?
