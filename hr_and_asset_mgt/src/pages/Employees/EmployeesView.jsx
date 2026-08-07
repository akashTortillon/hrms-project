// import React, { useEffect, useState } from "react";
// import { useSearchParams } from "react-router-dom";
// import EmployeesHeader from "./EmployeesHeader.jsx";
// import EmployeesTable from "./EmployeesTable.jsx";
// import AddEmployeeModal from "./AddEmployeeModal.jsx";
// import EditEmployeeModal from "./EditEmployeeModal.jsx";
// import {
//   getEmployees,
//   addEmployee,
//   updateEmployee,
//   deleteEmployee,
//   exportEmployees
// } from "../../services/employeeService.js";
// import { toast } from "react-toastify";
// import { getDepartments } from "../../services/masterService";

//export default function Employees() {
//       phone: emp.phone,
//       joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : emp.joinDate,
//       status: emp.status
//     }));

//     setEmployees(formattedEmployees);
//   } catch (error) {
//     console.error("Failed to fetch employees", error);
//     setEmployees([]); 
//   }
// };




//   const handleAddEmployee = async (employeeData) => {
//   try {
//     const response = await addEmployee(employeeData);

//     const { message, employee: newEmployee } = response;

//     // Show success toast with backend message
//     toast.success(message || "Employee added successfully 🎉");

//     // Transform to match table format
//     const formattedEmployee = {
//       id: newEmployee._id,
//       name: newEmployee.name,
//       code: newEmployee.code,
//       role: newEmployee.role,
//       department: newEmployee.department,
//       email: newEmployee.email,
//       phone: newEmployee.phone,
//       joinDate: newEmployee.joinDate ? new Date(newEmployee.joinDate).toISOString().split('T')[0] : newEmployee.joinDate,
//       status: newEmployee.status
//     };

//     setEmployees((prev) => [formattedEmployee, ...prev]);
//     setShowModal(false);
//   } catch (error) {
//     const errorMessage = error.response?.data?.message || error.message || "Failed to add employee";
//     toast.error(errorMessage);
//   }
// };


//   // 🔹 Apply filters & search
//   const filteredEmployees = employees.filter((emp) => {
//     const departmentMatch =
//       department === "All Departments" || emp.department === department;

//     const statusMatch =
//       status === "All Status" || emp.status === status;

//     const searchMatch =
//       emp.name.toLowerCase().includes(search.toLowerCase()) ||
//       emp.email.toLowerCase().includes(search.toLowerCase()) ||
//       emp.code.toLowerCase().includes(search.toLowerCase());

//     return departmentMatch && statusMatch && searchMatch;
//   });

//   return (
//     <div className="employees-page">
//       {/* HEADER */}
//       <EmployeesHeader
//         onAddEmployee={() => setShowModal(true)}
//         department={department}
//         setDepartment={setDepartment}
//         status={status}
//         setStatus={setStatus}
//         search={search}
//         setSearch={setSearch}
//       />

//       {/* TABLE */}
//       <EmployeesTable employees={filteredEmployees} />

//       {/* MODAL */}
//       {showModal && (
//         <AddEmployeeModal
//           onClose={() => setShowModal(false)}
//           onAddEmployee={handleAddEmployee}
//         />
//       )}
//     </div>
//   );
// }



import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmployeesHeader from "./EmployeesHeader.jsx";
import EmployeesTable from "./EmployeesTable.jsx";
import AddEmployeeModal from "./AddEmployeeModal.jsx";
import ImportEmployeeModal from "../../components/Employees/ImportEmployeeModal.jsx";
import ImportShiftModal from "../../components/Employees/ImportShiftModal.jsx";

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployees
} from "../../services/employeeService.js";
import { toast } from "react-toastify";

import { getDepartments, getBranches, getCompanies, getDesignations } from "../../services/masterService";
import { useRole } from "../../contexts/RoleContext";

const PAGE_SIZE = 20;

export default function Employees() {
  const { hasPermission, role } = useRole();
  // 🔹 URL Filters (Source of Truth)
  const [searchParams, setSearchParams] = useSearchParams();

  // 🔹 Single filter: pick a dimension (company/department/branch/designation), then a value within it
  const filterField = searchParams.get("filterField") || "department";
  const filterValue = searchParams.get("filterValue") || "";
  const status = searchParams.get("status") || "All Status";
  const urlSearch = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const PAGE_SIZE = 50;

  const department = filterField === "department" && filterValue ? filterValue : "All Departments";
  const branch = filterField === "branch" && filterValue ? filterValue : "All Branches";
  const company = filterField === "company" && filterValue ? filterValue : "All Companies";
  const designation = filterField === "designation" && filterValue ? filterValue : "All Designations";

  // 🔹 Local Search State (for Debounce)
  const [searchInput, setSearchInput] = useState(urlSearch);

  // 🔹 Options & Data
  const [deptOptions, setDeptOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportShiftsModal, setShowImportShiftsModal] = useState(false);

  const filterOptionsByField = {
    company: companyOptions,
    department: deptOptions,
    branch: branchOptions,
    designation: designationOptions
  };

  // 🔹 Sync Local Search with URL (e.g. back button)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // 🔹 Debounce Search -> Update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlSearch) {
        setSearchParams((prev) => {
          if (searchInput) prev.set("search", searchInput);
          else prev.delete("search");
          prev.delete("page");
          return prev;
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams, urlSearch]);

  // 🔹 Fetch filter dimension options on Mount
  useEffect(() => {
    loadDepartments();
    loadBranches();
    loadCompanies();
    loadDesignations();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      if (data) {
        setDeptOptions(data.map(d => d.name));
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await getBranches();
      if (data) {
        setBranchOptions(data.map(d => d.name));
      }
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      if (data) {
        setCompanyOptions(data.map(c => c.name));
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    }
  };

  const loadDesignations = async () => {
    try {
      const data = await getDesignations();
      if (data) {
        setDesignationOptions(data.map(d => d.name));
      }
    } catch (err) {
      console.error("Failed to load designations", err);
    }
  };

  // 🔹 Fetch Employees when URL Params change
  useEffect(() => {
    fetchEmployees();
  }, [searchParams]);

  const fetchEmployees = async () => {
    try {
      // Prepare params for backend
      // Backend expects 'department' string, 'status' string, 'search' string
      // If "All Departments", backend ignores or we send empty?
      // Backend logic: if (department && department !== "All Departments")
      // So sending "All Departments" is SAFE and handled.

      const params = {
        department,
        branch,
        company,
        designation,
        status,
        search: urlSearch,
        page,
        limit: PAGE_SIZE
      };

      const response = await getEmployees(params);
      // Passing `page` always triggers the paginated { employees, total, page, totalPages }
      // shape server-side (see employeeController.js's getEmployees) - the bare-array
      // response only happens for callers that don't pass page/limit at all.
      const employeesArray = Array.isArray(response) ? response : (response?.employees || []);

      const formattedEmployees = employeesArray.map((emp) => ({
        _id: emp._id,
        id: emp._id,
        name: emp.name,
        code: emp.code,
        role: emp.role,
        department: emp.department,
        email: emp.email,
        phone: emp.phone,
        joinDate: emp.joinDate
          ? new Date(emp.joinDate).toISOString().split("T")[0]
          : "",
        status: emp.status,
        profilePhotoUrl: emp.profilePhotoUrl
      }));

      setEmployees(formattedEmployees);
      setTotalEmployees(Array.isArray(response) ? formattedEmployees.length : (response?.total ?? formattedEmployees.length));
      setTotalPages(Array.isArray(response) ? 1 : (response?.totalPages ?? 1));
    } catch (error) {
      console.error("Failed to fetch employees", error);
      toast.error("Failed to load employees");
      setEmployees([]);
      setTotalEmployees(0);
      setTotalPages(1);
    }
  };

  // 🔹 Filter Handlers
  const handleSetFilterField = (field) => {
    setSearchParams(prev => {
      prev.set("filterField", field);
      prev.delete("filterValue");
      prev.delete("page");
      return prev;
    });
  };

  const handleSetFilterValue = (val) => {
    setSearchParams(prev => {
      if (val) prev.set("filterValue", val);
      else prev.delete("filterValue");
      prev.delete("page");
      return prev;
    });
  };

  const handleSetStatus = (val) => {
    setSearchParams(prev => {
      prev.set("status", val);
      prev.delete("page");
      return prev;
    });
  };

  const handleSetPage = (nextPage) => {
    setSearchParams(prev => {
      if (nextPage > 1) prev.set("page", String(nextPage));
      else prev.delete("page");
      return prev;
    });
  };

  // 🔹 ADD employee
  const handleAddEmployee = async (employeeData) => {
    try {
      const response = await addEmployee(employeeData);
      const { message } = response;

      toast.success(message || "Employee added successfully 🎉");
      fetchEmployees(); // URL hasn't changed, but data has.

      setShowAddModal(false);
    } catch (error) {
      console.error("Add Employee Error Details:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to add employee";

      toast.error(errorMessage);
    }
  };





  // 🔹 DELETE employee
  // const handleDeleteEmployee = async (emp) => {
  //   const confirmDelete = window.confirm(
  //     `Do you want to delete ${emp.name}?`
  //   );

  //   if (!confirmDelete) return;

  //   try {
  //     await deleteEmployee(emp._id || emp.id);
  //     fetchEmployees();
  //     toast.success("Employee removed successfully");
  //   } catch (error) {
  //     toast.error(
  //       error.response?.data?.message || "Failed to delete employee"
  //     );
  //   }
  // };

  // 🔹 EXPORT to Excel (Backend)
  const handleExport = async () => {
    try {
      const params = {
        department,
        branch,
        company,
        designation,
        status,
        search: searchInput
      };
      const blob = await exportEmployees(params);

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Employees_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="employees-page">
      {/* HEADER */}
      <EmployeesHeader
        onAddEmployee={hasPermission("MANAGE_EMPLOYEES") ? () => setShowAddModal(true) : null}
        filterField={filterField}
        setFilterField={handleSetFilterField}
        filterValue={filterValue}
        setFilterValue={handleSetFilterValue}
        filterOptionsByField={filterOptionsByField}
        status={status}
        setStatus={handleSetStatus}
        search={searchInput}
        setSearch={setSearchInput}
        onExport={hasPermission("MANAGE_EMPLOYEES") ? handleExport : null}
        onImport={
          hasPermission("MANAGE_EMPLOYEES")
            ? () => {
              console.log("Import clicked in View");
              setShowImportModal(true);
            }
            : () => console.log("Import permission denied or missing")
        }
        count={totalEmployees}
      />

      {/* TABLE - Use 'employees' directly as it is now filtered from backend */}
      <EmployeesTable
        employees={employees}
        page={page}
        totalPages={totalPages}
        totalCount={totalEmployees}
        pageSize={PAGE_SIZE}
        onPageChange={handleSetPage}
        // onDelete={handleDeleteEmployee}
      />

      {/* ADD MODAL */}
      {showAddModal && (
        <AddEmployeeModal
          deptOptions={deptOptions}
          onClose={() => setShowAddModal(false)}
          onAddEmployee={handleAddEmployee}
        />
      )}

      {/* IMPORT MODAL */}
      <ImportEmployeeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchEmployees();
          // Optional: keep modal open to show results, or close it?
          // The modal handles displaying results, so let's just refresh data
        }}
      />

      {/* IMPORT SHIFTS MODAL */}
      <ImportShiftModal
        isOpen={showImportShiftsModal}
        onClose={() => setShowImportShiftsModal(false)}
        onSuccess={() => fetchEmployees()}
      />
    </div>
  );
}
