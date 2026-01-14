import React, { useState, useEffect } from "react";
import { roleService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";

export default function AddEmployeeModal({ onClose, onAddEmployee }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    role: "",
    department: "",
    email: "",
    phone: "",
    joinDate: "",
    status: "Active",
  });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getAll();
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    }
  };


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    const { name, code, role, department, email, phone, joinDate } = form;

    if (!name || !role || !department || !email || !phone || !joinDate) {
      alert("All fields are required");
      return;
    }

    onAddEmployee(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Employee</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <input name="name" placeholder="Employee Name" onChange={handleChange} />


            <select name="role" onChange={handleChange} value={form.role}>
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r._id} value={r.name}>{r.name}</option>
              ))}
            </select>

            <select name="department" onChange={handleChange}>
              <option value="">Department</option>
              <option>Sales</option>
              <option>HR</option>
              <option>IT</option>
              <option>Finance</option>
              <option>Operations</option>
            </select>

            <input name="email" placeholder="Company Email" type="email" onChange={handleChange} />
            <input name="phone" placeholder="Phone Number" onChange={handleChange} />
            <input name="joinDate" type="date" onChange={handleChange} />

            <select name="status" onChange={handleChange}>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>
            Add Employee
          </button>
        </div>
      </div>
    </div>
  );
}
