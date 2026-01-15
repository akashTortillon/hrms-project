import React, { useState, useEffect } from "react";
import { roleService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";

export default function AddEmployeeModal({ onClose, onAddEmployee, deptOptions = [] }) {
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
            <div className="form-group">
              <label>Employee Name</label>
              <input name="name" placeholder="Enter Full Name" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select name="role" onChange={handleChange} value={form.role}>
                <option value="">Select Role</option>
                {roles.map((r) => (
                  <option key={r._id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select name="department" onChange={handleChange} value={form.department}>
                <option value="">Select Department</option>
                {deptOptions.map((dept, idx) => (
                  <option key={idx} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" placeholder="email@company.com" type="email" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div className="phone-input-wrapper" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: '#f9fafb' }}>
                <span style={{ padding: '0 12px', background: '#e5e7eb', color: '#374151', fontSize: '14px', fontWeight: '600', height: '44px', display: 'flex', alignItems: 'center' }}>+971</span>
                <input
                  name="phoneSuffix"
                  placeholder="50 123 4567"
                  onChange={(e) => {
                    // Allow only numbers
                    const val = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, phone: `+971${val}` }); // Store full phone in buffer or just handle submit?
                    // Actually better to store the suffix in local state or just handle it. 
                    // Let's rely on standard handleChange but specific logic.
                    // If I use name="phone", value will be what user types.
                    // I should probably manually update form.phone
                    setForm(prev => ({ ...prev, phone: `+971${val}` }));
                  }}
                  style={{ border: 'none', boxShadow: 'none', background: 'transparent', height: '44px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Joining Date</label>
              <input name="joinDate" type="date" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" onChange={handleChange}>
                <option>Active</option>
                <option>Inactive</option>
                <option>On Leave</option>
              </select>
            </div>
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
