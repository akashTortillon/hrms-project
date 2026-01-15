// import React, { useEffect, useState } from "react";
// import EmployeesHeader from "./EmployeesHeader.jsx";
// import EmployeesTable from "./EmployeesTable.jsx";
// import AddEmployeeModal from "./AddEmployeeModal.jsx";
// import { getEmployees, addEmployee } from "../../services/employeeService.js";
// import { toast } from "react-toastify";

// export default function Employees() {
//   // 🔹 Filters & search
//   const [department, setDepartment] = useState("All Departments");
//   const [status, setStatus] = useState("All Status");
//   const [search, setSearch] = useState("");

//   // 🔹 Data & UI
//   const [employees, setEmployees] = useState([]);
//   const [showModal, setShowModal] = useState(false);

//   // 🔹 Fetch employees on page load
//   useEffect(() => {
//     fetchEmployees();
//   }, []);




//   const fetchEmployees = async () => {
//   try {
//     const response = await getEmployees();


//     const employeesArray = Array.isArray(response) ? response : [];

//     // Transform API data to match table format
//     const formattedEmployees = employeesArray.map((emp, index) => ({
//       id: emp._id || index + 1,
//       name: emp.name,
//       code: emp.code,
//       role: emp.role,
//       department: emp.department,
//       email: emp.email,
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
import EmployeesHeader from "./EmployeesHeader.jsx";
import EmployeesTable from "./EmployeesTable.jsx";
import AddEmployeeModal from "./AddEmployeeModal.jsx";
import EditEmployeeModal from "./EditEmployeeModal.jsx";

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee
} from "../../services/employeeService.js";
import { toast } from "react-toastify";

import { getDepartments } from "../../services/masterService";

export default function Employees() {
  // 🔹 Filters & search
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState("");

  // 🔹 Options
  const [deptOptions, setDeptOptions] = useState([]);

  // 🔹 Data & UI
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // 🔹 Fetch Departments on Mount
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      if (data) {
        // Assuming data is array of objects { name: "Sales", ...}
        setDeptOptions(data.map(d => d.name));
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  // 🔹 Fetch Employees when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [department, status, search]);

  const fetchEmployees = async () => {
    try {
      // Pass filters to backend
      const params = {
        department,
        status,
        search
      };

      const response = await getEmployees(params);
      const employeesArray = Array.isArray(response) ? response : [];

      const formattedEmployees = employeesArray.map((emp) => ({
        _id: emp._id,
        id: emp._id, // used by table key
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

  // 🔹 ADD employee
  const handleAddEmployee = async (employeeData) => {
    try {
      const response = await addEmployee(employeeData);
      const { message, employee: newEmployee } = response;

      toast.success(message || "Employee added successfully 🎉");

      // Refresh list to ensure sorting/filtering is correct
      fetchEmployees();

      setShowAddModal(false);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add employee";
      toast.error(errorMessage);
    }
  };

  // 🔹 EDIT click
  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  // 🔹 UPDATE employee
  const handleUpdateEmployee = async (updatedEmployee) => {
    try {
      await updateEmployee(
        updatedEmployee._id,
        updatedEmployee
      );

      toast.success("Employee updated successfully");
      fetchEmployees(); // Refresh

      setShowEditModal(false);
      setSelectedEmployee(null);
    } catch (error) {
      toast.error("Failed to update employee");
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
      fetchEmployees(); // Refresh
      toast.success("Employee removed successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete employee"
      );
    }
  };

  return (
    <div className="employees-page">
      {/* HEADER */}
      <EmployeesHeader
        onAddEmployee={() => setShowAddModal(true)}
        department={department}
        setDepartment={setDepartment}
        status={status}
        setStatus={setStatus}
        search={search}
        setSearch={setSearch}
        deptOptions={deptOptions} // Pass dynamic options
      />

      {/* TABLE - Use 'employees' directly as it is now filtered from backend */}
      <EmployeesTable
        employees={employees}
        onEdit={handleEditClick}
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

      {/* EDIT MODAL */}
      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateEmployee}
          onDelete={handleDeleteEmployee}
        />
      )}
    </div>
  );
}
