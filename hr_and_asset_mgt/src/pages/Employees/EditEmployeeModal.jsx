import React, { useState } from "react";
import "../../style/AddEmployeeModal.css";

export default function EditEmployeeModal({ employee, onClose, onUpdate }) {
  const [form, setForm] = useState({ ...employee });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onUpdate(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>Edit Employee</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <input name="name" value={form.name} onChange={handleChange} />
            <input name="code" value={form.code} disabled />
            <input name="role" value={form.role} onChange={handleChange} />

            <select name="department" value={form.department} onChange={handleChange}>
              <option>Sales</option>
              <option>HR</option>
              <option>IT</option>
            </select>

            <input name="email" value={form.email} onChange={handleChange} />
            <input name="phone" value={form.phone} onChange={handleChange} />
            <input type="date" name="joinDate" value={form.joinDate?.slice(0,10)} onChange={handleChange} />

            <select name="status" value={form.status} onChange={handleChange}>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Update</button>
        </div>
      </div>
    </div>
  );
}
