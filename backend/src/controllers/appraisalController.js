import AppraisalCycle from "../models/appraisalCycleModel.js";
import Appraisal from "../models/appraisalModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";

const toNumber = (value) => Number(String(value || 0).replace(/[^0-9.-]+/g, "")) || 0;

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
      .populate("employee", "name code company branch designation basicSalary visaBase workBase")
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

    const appraisal = await Appraisal.create({
      ...req.body,
      currentSalary: toNumber(employee.visaBase || employee.basicSalary),
      recommendedSalary: toNumber(employee.visaBase || employee.basicSalary) + toNumber(req.body.recommendedIncrement),
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
    const latestVisaBase = toNumber(employee.visaBase || employee.basicSalary);
    const latestWorkBase = toNumber(employee.workBase || employee.basicSalary);
    const latestBasic = toNumber(employee.basicSalary);
    const latestCtc = toNumber(employee.ctc || employee.workBase || employee.basicSalary);

    appraisal.approvedIncrement = increment;
    appraisal.status = "APPROVED";
    appraisal.approvedBy = req.user._id;
    appraisal.approvedAt = new Date();
    appraisal.effectiveDate = effectiveDate;
    await appraisal.save();

    employee.basicSalary = String(latestBasic + increment);
    employee.visaBase = latestVisaBase + increment;
    employee.workBase = latestWorkBase + increment;
    employee.ctc = latestCtc + increment;
    employee.salaryHistory.push({
      salaryType: "APPRAISAL",
      basicSalary: latestBasic + increment,
      visaBase: latestVisaBase + increment,
      workBase: latestWorkBase + increment,
      ctc: latestCtc + increment,
      incrementAmount: increment,
      effectiveDate,
      notes: req.body.notes || "Approved through appraisal",
      createdBy: req.user._id
    });
    await employee.save();

    const linkedUser = await User.findOne({
      email: { $regex: new RegExp(`^${employee.email}$`, "i") }
    }).select("_id");

    if (linkedUser) {
      await createNotification({
        recipient: linkedUser._id,
        title: "Salary increment applied",
        message: `Your salary increment was approved by ${req.user.name || "HR/Admin"}. Salary updated from AED ${latestVisaBase.toFixed(2)} to AED ${(latestVisaBase + increment).toFixed(2)} with an increment of AED ${increment.toFixed(2)}, effective ${new Date(effectiveDate).toLocaleDateString()}.`,
        type: "INFO",
        link: "/app/requests"
      });
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
