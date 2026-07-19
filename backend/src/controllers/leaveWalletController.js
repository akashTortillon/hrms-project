import * as XLSX from "xlsx";
import LeaveWallet from "../models/leaveWalletModel.js";
import LeaveLedger from "../models/leaveLedgerModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import Master from "../models/masterModel.js";
import leaveWalletService from "../services/leaveWalletService.js";

// GET /api/leave-wallet/employee/:employeeId
// Returns every leave type's wallet balance for one employee (dashboard card).
export const getEmployeeWallets = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const leaveTypes = await Master.find({ type: "LEAVE_TYPE", isActive: true });
    const wallets = await LeaveWallet.find({ employee: employeeId });
    const walletByType = new Map(wallets.map(w => [String(w.leaveType), w]));

    const data = leaveTypes.map(lt => {
      const w = walletByType.get(String(lt._id));
      return {
        leaveTypeId: lt._id,
        leaveTypeName: lt.name,
        isPaid: lt.metadata?.isPaid !== false,
        creditedDays: w?.creditedDays || 0,
        usedDays: w?.usedDays || 0,
        balanceDays: w?.balanceDays || 0,
        overrideDays: w?.overrideDays ?? null,
        pendingDeductionDays: w?.pendingDeductionDays || 0,
        pendingDeductionAmount: w?.pendingDeductionAmount || 0,
        pendingRefundDays: w?.pendingRefundDays || 0,
        pendingRefundAmount: w?.pendingRefundAmount || 0,
        lastCreditDate: w?.lastCreditDate || null
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch leave wallet" });
  }
};

// GET /api/leave-wallet/my-wallet — logged-in employee's own balances
export const getMyWallets = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const employee = user?.employeeId
      ? await Employee.findById(user.employeeId)
      : await Employee.findOne({ email: { $regex: new RegExp(`^${user?.email || ""}$`, "i") } });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee record not found" });
    }
    req.params.employeeId = String(employee._id);
    return getEmployeeWallets(req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch leave wallet" });
  }
};

// GET /api/leave-wallet/employee/:employeeId/ledger?leaveTypeId=...
export const getEmployeeLedger = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leaveTypeId } = req.query;
    const match = { employee: employeeId };
    if (leaveTypeId) match.leaveType = leaveTypeId;

    const ledger = await LeaveLedger.find(match)
      .sort({ transactionDate: -1 })
      .populate("leaveType", "name")
      .populate("createdBy", "name");

    return res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch leave ledger" });
  }
};

// POST /api/leave-wallet/migration — HR one-time Excel migration entry
// Body: { employeeId, leaveTypeId, openingCredit, usedDays, remarks }
export const createMigrationEntry = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, openingCredit, usedDays, remarks } = req.body;
    if (!employeeId || !leaveTypeId || openingCredit == null || usedDays == null) {
      return res.status(400).json({ success: false, message: "employeeId, leaveTypeId, openingCredit and usedDays are required" });
    }

    const credit = Number(openingCredit);
    const used = Number(usedDays);

    const wallet = await leaveWalletService.getOrCreateWallet(employeeId, leaveTypeId);
    wallet.creditedDays += credit;
    wallet.usedDays += used;
    wallet.balanceDays += (credit - used);
    await wallet.save();

    await LeaveLedger.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      transactionType: "MIGRATION_ENTRY",
      days: credit,
      remarks: remarks || "Migration opening credit",
      createdBy: req.user.id
    });
    if (used > 0) {
      await LeaveLedger.create({
        employee: employeeId,
        leaveType: leaveTypeId,
        transactionType: "MIGRATION_ENTRY",
        days: -used,
        remarks: remarks || "Migration used-days entry",
        createdBy: req.user.id
      });
    }

    return res.status(201).json({ success: true, message: "Migration entry recorded", data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to record migration entry" });
  }
};

// PUT /api/leave-wallet/:employeeId/override — HR sets a custom per-employee allocation
// Body: { leaveTypeId, overrideDays, remarks }
export const setAllocationOverride = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leaveTypeId, overrideDays, remarks } = req.body;
    if (!leaveTypeId) {
      return res.status(400).json({ success: false, message: "leaveTypeId is required" });
    }

    const wallet = await leaveWalletService.getOrCreateWallet(employeeId, leaveTypeId);
    wallet.overrideDays = overrideDays === "" || overrideDays == null ? null : Number(overrideDays);
    await wallet.save();

    await LeaveLedger.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      transactionType: "MANUAL_CORRECTION",
      days: 0,
      remarks: remarks || `Allocation override set to ${wallet.overrideDays ?? "default"}`,
      createdBy: req.user.id
    });

    return res.status(200).json({ success: true, message: "Allocation override updated", data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update allocation override" });
  }
};

// POST /api/leave-wallet/:employeeId/advance — HR grants leave before eligibility
// Body: { leaveTypeId, days, remarks }
// Wallet goes negative; HR applies the matching salary deduction manually via the
// existing manual payroll-deduction UI (same mechanism as loans/advances).
export const grantAdvanceLeave = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leaveTypeId, days, remarks } = req.body;
    if (!leaveTypeId || !days) {
      return res.status(400).json({ success: false, message: "leaveTypeId and days are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const { wallet, deductionAmount, dailySalary } = await leaveWalletService.grantAdvanceLeave({
      employeeId,
      leaveTypeId,
      days: Number(days),
      employee,
      remarks,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: `Advance leave granted. Deduction of ${deductionAmount} (${days} day(s) x ${dailySalary.toFixed(2)}/day) locked — apply it via Payroll's manual adjustment for this employee's current cycle.`,
      data: wallet
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to grant advance leave" });
  }
};

// GET /api/leave-wallet/bulk-import/template — downloadable Excel template
// Columns: Employee Code, then one column per active Leave Type name.
export const downloadBulkImportTemplate = async (req, res) => {
  try {
    const leaveTypes = await Master.find({ type: "LEAVE_TYPE", isActive: true }).sort({ name: 1 });
    const headerRow = { "Employee Code": "EMP001" };
    leaveTypes.forEach(lt => { headerRow[lt.name] = 0; });

    const worksheet = XLSX.utils.json_to_sheet([headerRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Balances");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", 'attachment; filename="Leave_Balance_Import_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate template" });
  }
};

// POST /api/leave-wallet/bulk-import — HR uploads an Excel file with employee leave balances
// Excel layout (wide format): "Employee Code" column, then one column per Leave Type name
// (must match the Leave Type master exactly, case-insensitive). Each cell = the balance to
// SET for that employee/leave type (not add-on-top) — this is a snapshot import, matching
// the single-employee "Migrate Balance" semantics but for many employees at once.
export const bulkImportBalances = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Excel file has no data rows" });
    }

    const leaveTypes = await Master.find({ type: "LEAVE_TYPE", isActive: true });
    const leaveTypeByName = new Map(leaveTypes.map(lt => [lt.name.toLowerCase(), lt]));

    // Detect which columns in the sheet are leave-type columns (case-insensitive match to Master)
    const sampleRow = rows[0];
    const codeColumn = Object.keys(sampleRow).find(k => k.toLowerCase().replace(/\s+/g, "") === "employeecode")
      || Object.keys(sampleRow).find(k => k.toLowerCase().includes("employee") && k.toLowerCase().includes("code"))
      || "Employee Code";
    const leaveColumns = Object.keys(sampleRow).filter(k => k !== codeColumn && leaveTypeByName.has(k.toLowerCase()));

    if (!leaveColumns.length) {
      return res.status(400).json({
        success: false,
        message: `No matching Leave Type columns found. Column headers must exactly match active Leave Types: ${leaveTypes.map(l => l.name).join(", ")}`
      });
    }

    let successCount = 0;
    const errors = [];
    const unmatchedLeaveColumns = Object.keys(sampleRow).filter(
      k => k !== codeColumn && !leaveColumns.includes(k)
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const code = row[codeColumn] ? String(row[codeColumn]).trim() : "";

      if (!code) {
        errors.push({ row: rowNum, message: "Missing Employee Code" });
        continue;
      }

      const employee = await Employee.findOne({ code });
      if (!employee) {
        errors.push({ row: rowNum, code, message: `Employee code '${code}' not found` });
        continue;
      }

      for (const col of leaveColumns) {
        const rawValue = row[col];
        if (rawValue === undefined || rawValue === "" || rawValue === null) continue;

        const targetBalance = Number(rawValue);
        if (!Number.isFinite(targetBalance)) {
          errors.push({ row: rowNum, code, message: `Invalid number in column '${col}': '${rawValue}'` });
          continue;
        }

        const leaveType = leaveTypeByName.get(col.toLowerCase());
        const wallet = await leaveWalletService.getOrCreateWallet(employee._id, leaveType._id);
        const delta = targetBalance - wallet.balanceDays;

        if (delta !== 0) {
          wallet.creditedDays += delta;
          wallet.balanceDays = targetBalance;
          await wallet.save();

          await LeaveLedger.create({
            employee: employee._id,
            leaveType: leaveType._id,
            transactionType: "MIGRATION_ENTRY",
            days: delta,
            remarks: `Bulk import: balance set to ${targetBalance}`,
            createdBy: req.user.id
          });
        }
      }

      successCount++;
    }

    return res.status(200).json({
      success: true,
      message: "Bulk import processed",
      successCount,
      failureCount: errors.length,
      errors,
      ...(unmatchedLeaveColumns.length ? { warning: `Columns ignored (no matching Leave Type): ${unmatchedLeaveColumns.join(", ")}` } : {})
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Bulk import failed" });
  }
};

// PATCH /api/leave-wallet/:employeeId/clear-refund — HR marks pending refund as paid
export const clearPendingRefund = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leaveTypeId } = req.body;
    if (!leaveTypeId) {
      return res.status(400).json({ success: false, message: "leaveTypeId is required" });
    }

    const wallet = await LeaveWallet.findOne({ employee: employeeId, leaveType: leaveTypeId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const clearedDays = wallet.pendingRefundDays;
    const clearedAmount = wallet.pendingRefundAmount;
    wallet.pendingRefundDays = 0;
    wallet.pendingRefundAmount = 0;
    await wallet.save();

    await LeaveLedger.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      transactionType: "MANUAL_CORRECTION",
      days: 0,
      remarks: `Payroll refund of ${clearedAmount} (${clearedDays} day(s)) applied and cleared`,
      createdBy: req.user.id
    });

    return res.status(200).json({ success: true, message: "Refund marked as paid", data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to clear pending refund" });
  }
};
