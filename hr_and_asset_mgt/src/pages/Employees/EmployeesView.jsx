import React, { useEffect, useState } from "react";
import EmployeesHeader from "./EmployeesHeader.jsx";
import EmployeesTable from "./EmployeesTable.jsx";
import AddEmployeeModal from "./AddEmployeeModal.jsx";
import { getEmployees, addEmployee } from "../../services/employeeService.js";
import { toast } from "react-toastify";

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

  


  const fetchEmployees = async () => {
  try {
    const response = await getEmployees();
    
    
    const employeesArray = Array.isArray(response) ? response : [];
    
    // Transform API data to match table format
    const formattedEmployees = employeesArray.map((emp, index) => ({
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
    setEmployees([]); 
  }
};

  


  const handleAddEmployee = async (employeeData) => {
  try {
    const response = await addEmployee(employeeData);
    
    const { message, employee: newEmployee } = response;
    
    // Show success toast with backend message
    toast.success(message || "Employee added successfully 🎉");
    
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
    const errorMessage = error.response?.data?.message || error.message || "Failed to add employee";
    toast.error(errorMessage);
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
