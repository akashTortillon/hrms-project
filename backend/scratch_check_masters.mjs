import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Master from "./src/models/masterModel.js";

await mongoose.connect(process.env.DB_URL);

const companies = await Master.find({ type: "COMPANY" }).select("name code");
console.log("--- Companies in Master data ---");
console.log(companies.map(c => `${c.name} (code: ${c.code || "none"})`).join("\n"));

console.log("\n--- Branches under RIZAN ---");
const rizan = companies.find(c => c.name.toUpperCase() === "RIZAN");
if (rizan) {
  const branches = await Master.find({ type: "BRANCH", parentId: rizan._id }).select("name");
  console.log(branches.length ? branches.map(b => b.name).join(", ") : "(none)");
} else {
  console.log("RIZAN company not found");
}

console.log("\n--- Missing companies from the file (not in Master COMPANY list) ---");
const missingCompanies = ["FINCAP JEWELLERY TRADING LLC"];
missingCompanies.forEach(name => {
  const found = companies.find(c => c.name.toLowerCase() === name.toLowerCase());
  console.log(`${name}: ${found ? "EXISTS" : "MISSING"}`);
});

await mongoose.disconnect();
process.exit(0);
