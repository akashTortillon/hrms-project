import Employee from "../models/employeeModel.js";
import Asset from "../models/assetModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";

export const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters long" });
        }

        const searchRegex = new RegExp(query, "i");

        const [employees, assets, companyDocs, employeeDocs] = await Promise.all([
            // 1. Search Employees
            Employee.find({
                $or: [
                    { name: searchRegex },
                    { code: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            }).select("name code email phone department role status avatar").limit(10),

            // 2. Search Assets
            Asset.find({
                $or: [
                    { name: searchRegex },
                    { assetCode: searchRegex },
                    { serialNumber: searchRegex }
                ]
            }).select("name assetCode serialNumber type status").limit(10),

            // 3. Search Company Documents
            CompanyDocument.find({
                $or: [
                    { name: searchRegex },
                    { type: searchRegex }
                ]
            }).select("name type issueDate expiryDate status").limit(10),

            // 4. Search Employee Documents (Requires lookup to be meaningful, but basic search for now)
            EmployeeDocument.find({
                $or: [
                    { documentType: searchRegex },
                    { documentNumber: searchRegex }
                ]
            })
                .populate("employeeId", "name code")
                .limit(10)
        ]);

        const results = {
            employees,
            assets,
            documents: [
                ...companyDocs.map(d => ({ ...d.toObject(), category: "Company" })),
                ...employeeDocs.map(d => ({ ...d.toObject(), category: "Employee" }))
            ]
        };

        res.json({ success: true, data: results });

    } catch (error) {
        console.error("Global Search Error:", error);
        res.status(500).json({ message: "Search failed" });
    }
};
