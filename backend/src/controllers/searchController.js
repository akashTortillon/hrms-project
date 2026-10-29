import Employee from "../models/employeeModel.js";
import Asset from "../models/assetModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";
import { buildEmployeeScopeFilter } from "../utils/managerScopeUtils.js";
import { escapeRegex } from "../utils/stringUtils.js";

export const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        const { permissions, role } = req.user;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: "Search query must be at least 2 characters long" });
        }

        // Escaped: the raw query was interpolated into a RegExp (injection / ReDoS).
        const searchRegex = new RegExp(escapeRegex(query.trim()), "i");

        // Permission checks
        const canViewAllEmployees = role === "Admin" || permissions.includes("ALL") || permissions.includes("VIEW_ALL_EMPLOYEES");
        const canManageAssets = role === "Admin" || permissions.includes("ALL") || permissions.includes("MANAGE_ASSETS");
        const canManageDocs = role === "Admin" || permissions.includes("ALL") || permissions.includes("MANAGE_DOCUMENTS");

        const searchPromises = [];

        // 1. Search Employees (If authorized)
        // VIEW_ALL_EMPLOYEES is held by Managers/Finance Managers for pickers - it does
        // not mean "may see the whole company". Scope exactly like the Employees page.
        const scopeFilter = buildEmployeeScopeFilter(req.user);
        if (canViewAllEmployees) {
            const employeeQuery = {
                $and: [
                    { $or: [{ name: searchRegex }, { code: searchRegex }, { email: searchRegex }, { phone: searchRegex }] },
                    ...(scopeFilter ? [scopeFilter] : [])
                ]
            };
            searchPromises.push(Employee.find(employeeQuery)
                .select("name code email phone department role status avatar").limit(10));
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

        // 4. Search Employee Documents (If authorized) - scoped to the same employees
        // the requester may see, so a manager with MANAGE_DOCUMENTS can't read others'.
        if (canManageDocs) {
            let scopedEmployeeIds = null;
            if (scopeFilter) {
                scopedEmployeeIds = (await Employee.find(scopeFilter).select("_id").lean()).map(e => e._id);
            }
            searchPromises.push(EmployeeDocument.find({
                $and: [
                    { $or: [{ documentType: searchRegex }, { documentNumber: searchRegex }] },
                    ...(scopedEmployeeIds ? [{ employeeId: { $in: scopedEmployeeIds } }] : [])
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
