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

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployees
} from "../../services/employeeService.js";
import { toast } from "react-toastify";

import { getDepartments } from "../../services/masterService";
import { useRole } from "../../contexts/RoleContext";

export default function Employees() {
  const { hasPermission } = useRole();
  // 🔹 URL Filters (Source of Truth)
  const [searchParams, setSearchParams] = useSearchParams();

  const department = searchParams.get("department") || "All Departments";
  const status = searchParams.get("status") || "All Status";
  const urlSearch = searchParams.get("search") || "";

  // 🔹 Local Search State (for Debounce)
  const [searchInput, setSearchInput] = useState(urlSearch);

  // 🔹 Options & Data
  const [deptOptions, setDeptOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

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
          return prev;
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams, urlSearch]);

  // 🔹 Fetch Departments on Mount
  useEffect(() => {
    loadDepartments();
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
        status,
        search: urlSearch
      };

      const response = await getEmployees(params);
      const employeesArray = Array.isArray(response) ? response : [];

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
        status: emp.status
      }));

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error("Failed to fetch employees", error);
      toast.error("Failed to load employees");
      setEmployees([]);
    }
  };

  // 🔹 Filter Handlers
  const handleSetDepartment = (val) => {
    setSearchParams(prev => {
      prev.set("department", val);
      // If val is "All Departments", we can keep it or delete it. 
      // Keeping it makes UI state explicit in URL: ?department=All%20Departments
      return prev;
    });
  };

  const handleSetStatus = (val) => {
    setSearchParams(prev => {
      prev.set("status", val);
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
  const handleDeleteEmployee = async (emp) => {
    const confirmDelete = window.confirm(
      `Do you want to delete ${emp.name}?`
    );

    if (!confirmDelete) return;

    try {
      await deleteEmployee(emp._id || emp.id);
      fetchEmployees();
      toast.success("Employee removed successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete employee"
      );
    }
  };

  // 🔹 EXPORT to Excel (Backend)
  const handleExport = async () => {
    try {
      const params = {
        department,
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
        department={department}
        setDepartment={handleSetDepartment}
        status={status}
        setStatus={handleSetStatus}
        search={searchInput}
        setSearch={setSearchInput}
        deptOptions={deptOptions}
        onExport={hasPermission("MANAGE_EMPLOYEES") ? handleExport : null}
        count={employees.length}
      />

      {/* TABLE - Use 'employees' directly as it is now filtered from backend */}
      <EmployeesTable
        employees={employees}
        onDelete={handleDeleteEmployee}
      />

      {/* ADD MODAL */}
      {showAddModal && (
        <AddEmployeeModal
          deptOptions={deptOptions}
          onClose={() => setShowAddModal(false)}
          onAddEmployee={handleAddEmployee}
        />
      )}
    </div>
  );
}
