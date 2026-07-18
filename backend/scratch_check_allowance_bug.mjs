import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Appraisal from "./src/models/appraisalModel.js";
import Employee from "./src/models/employeeModel.js";
import SystemSettings from "./src/models/systemSettingsModel.js";

await mongoose.connect(process.env.DB_URL);

const settings = await SystemSettings.findOne();
console.log("allowanceTypes:", JSON.stringify(settings.allowanceTypes));

const badAppraisals = await Appraisal.find({
  $or: [
    { type: { $exists: false } },
    { type: "" },
    { type: "ALLOWANCE", allowanceTypeName: "" }
  ]
}).select("employee type allowanceTypeName comments recommendedIncrement createdAt");
console.log("appraisals with empty type/allowanceTypeName:", JSON.stringify(badAppraisals, null, 2));

const emps = await Employee.find({ "allowances.typeName": "" }).select("name code allowances");
console.log("employees with empty allowance typeName:", JSON.stringify(emps, null, 2));

const allAppraisalsCount = await Appraisal.countDocuments();
const allowanceTypeAppraisals = await Appraisal.countDocuments({ type: "ALLOWANCE" });
console.log("total appraisals:", allAppraisalsCount, "allowance-type appraisals:", allowanceTypeAppraisals);

await mongoose.disconnect();
process.exit(0);
