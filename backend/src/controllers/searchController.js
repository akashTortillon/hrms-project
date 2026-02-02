import Employee from "../models/employeeModel.js";
import Asset from "../models/assetModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";

export const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        const { permissions, role } = req.user;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters long" });
        }

        const searchRegex = new RegExp(query, "i");

        // Permission checks
        const canViewAllEmployees = role === "Admin" || permissions.includes("ALL") || permissions.includes("VIEW_ALL_EMPLOYEES");
        const canManageAssets = role === "Admin" || permissions.includes("ALL") || permissions.includes("MANAGE_ASSETS");
        const canManageDocs = role === "Admin" || permissions.includes("ALL") || permissions.includes("MANAGE_DOCUMENTS");

        const searchPromises = [];

        // 1. Search Employees (If authorized)
        if (canViewAllEmployees) {
            searchPromises.push(Employee.find({
                $or: [
                    { name: searchRegex },
                    { code: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            }).select("name code email phone department role status avatar").limit(10));
        } else {
            searchPromises.push(Promise.resolve([]));
        }

        // 2. Search Assets (If authorized)
        if (canManageAssets) {
            searchPromises.push(Asset.find({
                $or: [
                    { name: searchRegex },
                    { assetCode: searchRegex },
                    { serialNumber: searchRegex }
                ]
            }).select("name assetCode serialNumber type status").limit(10));
        } else {
            searchPromises.push(Promise.resolve([]));
        }

        // 3. Search Company Documents (If authorized)
        if (canManageDocs) {
            searchPromises.push(CompanyDocument.find({
                $or: [
                    { name: searchRegex },
                    { type: searchRegex }
                ]
            }).select("name type issueDate expiryDate status").limit(10));
        } else {
            searchPromises.push(Promise.resolve([]));
        }

        // 4. Search Employee Documents (If authorized)
        if (canManageDocs) {
            searchPromises.push(EmployeeDocument.find({
                $or: [
                    { documentType: searchRegex },
                    { documentNumber: searchRegex }
                ]
            })
                .populate("employeeId", "name code")
                .limit(10));
        } else {
            searchPromises.push(Promise.resolve([]));
        }

        const [employees, assets, companyDocs, employeeDocs] = await Promise.all(searchPromises);

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
