import AppraisalCycle from "../models/appraisalCycleModel.js";
import Appraisal from "../models/appraisalModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";
import { toNumber, computeTotalSalary, computeCtc, splitIncrement } from "../utils/salaryCalc.js";

export const getAppraisalCycles = async (req, res) => {
  try {
    const cycles = await AppraisalCycle.find().sort({ startDate: -1 });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appraisal cycles" });
  }
};

export const createAppraisalCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(cycle);
  } catch (error) {
    res.status(500).json({ message: "Failed to create appraisal cycle" });
  }
};

export const getAppraisals = async (req, res) => {
  try {
    const query = {};
    if (req.query.cycle) query.cycle = req.query.cycle;
    if (req.query.employee) query.employee = req.query.employee;

    const appraisals = await Appraisal.find(query)
      .populate("employee", "name code company branch department designation basicSalary visaBase workBase")
      .populate("cycle", "name startDate endDate status")
      .sort({ createdAt: -1 });

    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appraisals" });
  }
};

export const createAppraisal = async (req, res) => {
  try {
    const employee = await Employee.findById(req.body.employee);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const increment = toNumber(req.body.recommendedIncrement);
    let currentSalary;

    if (req.body.type === "ALLOWANCE") {
      const existing = employee.allowances.find((item) => item.typeName === req.body.allowanceTypeName);
      currentSalary = existing ? toNumber(existing.amount) : 0;
    } else {
      currentSalary = toNumber(employee.visaBase || employee.basicSalary);
    }

    const appraisal = await Appraisal.create({
      ...req.body,
      currentSalary,
      recommendedSalary: currentSalary + increment,
      createdBy: req.user._id
    });

    res.status(201).json(appraisal);
  } catch (error) {
    res.status(500).json({ message: "Failed to create appraisal" });
  }
};

export const approveAppraisal = async (req, res) => {
  try {
    const appraisal = await Appraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found" });
    }

    const employee = await Employee.findById(appraisal.employee);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const increment = toNumber(req.body.approvedIncrement ?? appraisal.recommendedIncrement);
    const effectiveDate = req.body.effectiveDate || appraisal.effectiveDate || new Date();

    appraisal.approvedIncrement = increment;
    appraisal.status = "APPROVED";
    appraisal.approvedBy = req.user._id;
    appraisal.approvedAt = new Date();
    appraisal.effectiveDate = effectiveDate;
    await appraisal.save();

    const linkedUser = await User.findOne({
      email: { $regex: new RegExp(`^${employee.email}$`, "i") }
    }).select("_id");

    if (appraisal.type === "ALLOWANCE") {
      // Respect the "Include in Payroll" flag set by HR at the time of submission.
      // Default to true so that appraisals created before this field existed continue
      // to behave as before (included in payroll).
      const includeInPayroll = appraisal.includeInPayroll !== false;

      const existing = employee.allowances.find((item) => item.typeName === appraisal.allowanceTypeName);
      if (existing) {
        existing.amount = toNumber(existing.amount) + increment;
        // Always sync the flag — if HR changes preference on a subsequent appraisal
        // the latest decision wins.
        existing.includeInPayroll = includeInPayroll;
      } else {
        employee.allowances.push({
          typeName: appraisal.allowanceTypeName,
          amount: increment,
          effectiveDate,
          addedBy: req.user._id,
          includeInPayroll
        });
      }
      employee.totalSalary = computeTotalSalary(employee);
      employee.ctc = computeCtc(employee);
      await employee.save();

      if (linkedUser) {
        const payrollNote = includeInPayroll ? "" : " This allowance is excluded from payroll.";
        await createNotification({
          recipient: linkedUser._id,
          title: "Allowance updated",
          message: `Your "${appraisal.allowanceTypeName}" allowance was updated by ${req.user.name || "HR/Admin"}, increased by AED ${increment.toFixed(2)}, effective ${new Date(effectiveDate).toLocaleDateString()}.${payrollNote}`,
          type: "INFO",
          link: "/app/requests"
        });
      }
    } else {
      const latestVisaBase = toNumber(employee.visaBase || employee.basicSalary);
      const latestWorkBase = toNumber(employee.workBase || employee.basicSalary);

      // Gross-first, then split: add the full increment to the current gross
      // (basicSalary + hra + allowance) FIRST, then re-derive basicSalary/hra/allowance
      // as exactly 50/30/20 of that new gross - not add a 50/30/20 split of just the
      // increment delta onto whatever the three fields happened to already hold. The old
      // delta-only approach let basic/hra/allowance drift away from a clean 50/30/20 ratio
      // over repeated increments (e.g. if a field was ever hand-edited); this keeps the
      // ratio exact after every increment, at the cost of overwriting any such prior
      // manual adjustment to the individual components.
      const newGross = computeTotalSalary(employee) + increment;
      const { basicDelta: newBasic, hraDelta: newHra, allowanceDelta: newAllowance } = splitIncrement(newGross);
      const newVisaBase = latestVisaBase + increment;
      const newWorkBase = latestWorkBase + increment;
      const newCtc = computeCtc({
        basicSalary: newBasic,
        allowance: newAllowance,
        hra: newHra,
        accommodationAllowance: employee.accommodationAllowance,
        vehicleAllowance: employee.vehicleAllowance
      });

      // Only apply immediately when the effective date is today or in the past.
      // Future-dated increments are recorded but left pending until their date arrives
      // (see applyDuePendingSalaryChanges) - mirrors transferEmployee's isImmediate gate.
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const isImmediate = new Date(effectiveDate) <= endOfToday;

      employee.salaryHistory.push({
        salaryType: "APPRAISAL",
        basicSalary: newBasic,
        visaBase: newVisaBase,
        workBase: newWorkBase,
        allowance: newAllowance,
        hra: newHra,
        ctc: newCtc,
        incrementAmount: increment,
        effectiveDate,
        notes: req.body.notes || "Approved through appraisal",
        createdBy: req.user._id,
        applied: isImmediate
      });

      if (isImmediate) {
        employee.basicSalary = String(newBasic);
        employee.visaBase = newVisaBase;
        employee.workBase = newWorkBase;
        employee.hra = newHra;
        employee.allowance = newAllowance;
        employee.totalSalary = computeTotalSalary(employee);
        employee.ctc = computeCtc(employee);
      }
      await employee.save();

      if (linkedUser) {
        const message = isImmediate
          ? `Your salary increment was approved by ${req.user.name || "HR/Admin"}. Salary updated from AED ${latestVisaBase.toFixed(2)} to AED ${newVisaBase.toFixed(2)} with an increment of AED ${increment.toFixed(2)}, effective ${new Date(effectiveDate).toLocaleDateString()}.`
          : `Your salary increment of AED ${increment.toFixed(2)} was approved by ${req.user.name || "HR/Admin"} and will take effect on ${new Date(effectiveDate).toLocaleDateString()}.`;
        await createNotification({
          recipient: linkedUser._id,
          title: "Salary increment applied",
          message,
          type: "INFO",
          link: "/app/requests"
        });
      }
    }

    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ message: "Failed to approve appraisal" });
  }
};

export const rejectAppraisal = async (req, res) => {
  try {
    const appraisal = await Appraisal.findByIdAndUpdate(
      req.params.id,
      { status: "REJECTED", approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!appraisal) {
      return res.status(404).json({ message: "Appraisal not found" });
    }
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ message: "Failed to reject appraisal" });
  }
};
