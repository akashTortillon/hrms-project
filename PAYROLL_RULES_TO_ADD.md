# Payroll Rules & Leave Configuration

Please manually add the following entries in the **Masters** section of your application.

## 1. Payroll Rules (Type: `payroll-rules`)

Add these under the **Payroll Rules** master list.

### A. House Rent Allowance (HRA)
*   **Name**: House Rent Allowance (HRA)
*   **Code**: HRA
*   **Metadata (JSON)**:
    ```json
    {
      "category": "ALLOWANCE",
      "calculationType": "PERCENTAGE",
      "value": 20,
      "base": "BASIC_SALARY",
      "isAutomatic": true
    }
    ```

### B. Transport Allowance
*   **Name**: Transport Allowance
*   **Code**: TA
*   **Metadata (JSON)**:
    ```json
    {
      "category": "ALLOWANCE",
      "calculationType": "FIXED",
      "value": 1000,
      "isAutomatic": true
    }
    ```

### C. Phone Allowance
*   **Name**: Phone Allowance
*   **Code**: PHONE
*   **Metadata (JSON)**:
    ```json
    {
      "category": "ALLOWANCE",
      "calculationType": "FIXED",
      "value": 200,
      "isAutomatic": true
    }
    ```

### D. Unpaid Leave Deduction (LOP)
*   **Name**: Unpaid Leave Deduction
*   **Code**: LOP
*   **Metadata (JSON)**:
    ```json
    {
      "category": "DEDUCTION",
      "calculationType": "DAILY_RATE",
      "value": 1,
      "base": "GROSS_SALARY",
      "isAutomatic": true
    }
    ```

### E. Overtime (Regular)
*   **Name**: Overtime (Regular)
*   **Code**: OT_REG
*   **Metadata (JSON)**:
    ```json
    {
      "category": "ALLOWANCE",
      "calculationType": "HOURLY_MULTIPLIER",
      "value": 1.25,
      "base": "HOURLY_RATE",
      "isAutomatic": false
    }
    ```

### F. Late Deduction
*   **Name**: Late Deduction
*   **Code**: LATE (or LATE_DEDUCTION)
*   **Metadata (JSON)**:
    ```json
    {
      "category": "DEDUCTION",
      "calculationType": "DAILY_RATE", 
      "value": 0.5, 
      "condition": "LATE_INSTANCE",
      "isAutomatic": true
    }
    ```
    *Logic: Deduct 0.5 (Half Day) * Daily Rate for each Late instance.*

---

## 2. Leave Types (Type: `leave-types`)

Add these under the **Leave Types** master list.

### A. Annual Leave
*   **Name**: Annual Leave
*   **Metadata (JSON)**:
    ```json
    {
      "maxDaysPerYear": 30,
      "accrualRate": 2.5,
      "accrualFrequency": "MONTHLY",
      "isPaid": true,
      "carryForwardLimit": 15
    }
    ```

### B. Sick Leave
*   **Name**: Sick Leave
*   **Metadata (JSON)**:
    ```json
    {
      "maxDaysPerYear": 15,
      "accrualRate": 1.25,
      "isPaid": true,
      "payPercentage": 100
    }
    ```

### C. Maternity Leave
*   **Name**: Maternity Leave
*   **Metadata (JSON)**:
    ```json
    {
      "maxDaysPerYear": 60,
      "accrualRate": 0,
      "isPaid": true
    }
    ```

### D. Unpaid Leave
*   **Name**: Unpaid Leave
*   **Metadata (JSON)**:
    ```json
    {
      "isPaid": false
    }
    ```
