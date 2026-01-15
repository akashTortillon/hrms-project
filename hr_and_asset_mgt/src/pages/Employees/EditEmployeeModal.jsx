import React, { useState, useEffect } from "react";
import { roleService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";

export default function EditEmployeeModal({ employee, onClose, onUpdate, deptOptions = [] }) {
  const [form, setForm] = useState({ ...employee });
  const [roles, setRoles] = useState([]);
  const [phoneSuffix, setPhoneSuffix] = useState("");

  useEffect(() => {
    fetchRoles();

    // Parse phone for display
    if (employee.phone) {
      // Remove +971, 00971, 971, or leading 0 if standardizing
      let raw = employee.phone.toString();
      if (raw.startsWith("+971")) raw = raw.replace("+971", "");
      else if (raw.startsWith("00971")) raw = raw.replace("00971", "");
      else if (raw.startsWith("971")) raw = raw.replace("971", "");
      setPhoneSuffix(raw);
    }
  }, [employee]);

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

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setPhoneSuffix(val);
    setForm({ ...form, phone: `+971${val}` });
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
            {/* Name - Full Width */}
            <div className="form-group">
              <label>Employee Name</label>
              <input name="name" value={form.name} onChange={handleChange} />
            </div>

            {/* Code (Read-Only) & Role */}
            <div className="form-group">
              <label>Employee Code</label>
              <input name="code" value={form.code} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
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

            {/* Dept & Email */}
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
              <input name="email" value={form.email} onChange={handleChange} />
            </div>

            {/* Phone & Join Date */}
            <div className="form-group">
              <label>Phone Number</label>
              <div className="phone-input-wrapper" style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: '#f9fafb' }}>
                <span style={{ padding: '0 12px', background: '#e5e7eb', color: '#374151', fontSize: '14px', fontWeight: '600', height: '40px', display: 'flex', alignItems: 'center' }}>+971</span>
                <input
                  value={phoneSuffix}
                  placeholder="50 123 4567"
                  onChange={handlePhoneChange}
                  style={{ border: 'none', boxShadow: 'none', background: 'transparent', height: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Joining Date</label>
              <input type="date" name="joinDate" value={form.joinDate ? form.joinDate.slice(0, 10) : ''} onChange={handleChange} />
            </div>

            {/* Status & Placeholder/Empty */}
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option>Active</option>
                <option>Inactive</option>
                <option>On Leave</option>
              </select>
            </div>

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
