import React, { useEffect, useState } from "react";
import EmployeesHeader from "./EmployeesHeader.jsx";
import EmployeesTable from "./EmployeesTable.jsx";
import AddEmployeeModal from "./AddEmployeeModal.jsx";
import { getEmployees, addEmployee } from "../../services/employeeService.js";

export default function Employees() {
  // 🔹 Filters & search
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState("");

  // 🔹 Data & UI
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // 🔹 Fetch employees on page load
  useEffect(() => {
    fetchEmployees();
  }, []);

  // const fetchEmployees = async () => {
  //   try {
  //     const data = await getEmployees();
  //     setEmployees(data);
  //   } catch (error) {
  //     console.error("Failed to fetch employees", error);
  //   }
  // };


  const fetchEmployees = async () => {
  try {
    const response = await getEmployees();
    
    // Transform API data to match table format
    const formattedEmployees = response.data.map((emp, index) => ({
      id: emp._id || index + 1,
      name: emp.name,
      code: emp.code,
      role: emp.role,
      department: emp.department,
      email: emp.email,
      phone: emp.phone,
      joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : emp.joinDate,
      status: emp.status
    }));
    
    setEmployees(formattedEmployees);
  } catch (error) {
    console.error("Failed to fetch employees", error);
  }
};

  // 🔹 Add new employee (called from modal)
  // const handleAddEmployee = async (employeeData) => {
  //   try {
  //     const newEmployee = await addEmployee(employeeData);
  //     setEmployees((prev) => [newEmployee, ...prev]);
  //     setShowModal(false);
  //   } catch (error) {
  //     alert(error.message || "Failed to add employee");
  //   }
  // };


  const handleAddEmployee = async (employeeData) => {
  try {
    const response = await addEmployee(employeeData);
    const newEmployee = response.data.employee;
    
    // Transform to match table format
    const formattedEmployee = {
      id: newEmployee._id,
      name: newEmployee.name,
      code: newEmployee.code,
      role: newEmployee.role,
      department: newEmployee.department,
      email: newEmployee.email,
      phone: newEmployee.phone,
      joinDate: newEmployee.joinDate ? new Date(newEmployee.joinDate).toISOString().split('T')[0] : newEmployee.joinDate,
      status: newEmployee.status
    };
    
    setEmployees((prev) => [formattedEmployee, ...prev]);
    setShowModal(false);
  } catch (error) {
    alert(error.response?.data?.message || error.message || "Failed to add employee");
  }
};


  // 🔹 Apply filters & search
  const filteredEmployees = employees.filter((emp) => {
    const departmentMatch =
      department === "All Departments" || emp.department === department;

    const statusMatch =
      status === "All Status" || emp.status === status;

    const searchMatch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.code.toLowerCase().includes(search.toLowerCase());

    return departmentMatch && statusMatch && searchMatch;
  });

  return (
    <div className="employees-page">
      {/* HEADER */}
      <EmployeesHeader
        onAddEmployee={() => setShowModal(true)}
        department={department}
        setDepartment={setDepartment}
        status={status}
        setStatus={setStatus}
        search={search}
        setSearch={setSearch}
      />

      {/* TABLE */}
      <EmployeesTable employees={filteredEmployees} />

      {/* MODAL */}
      {showModal && (
        <AddEmployeeModal
          onClose={() => setShowModal(false)}
          onAddEmployee={handleAddEmployee}
        />
      )}
    </div>
  );
}
