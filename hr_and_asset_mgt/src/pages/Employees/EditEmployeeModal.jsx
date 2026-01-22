import React, { useState, useEffect } from "react";
import { roleService, employeeTypeService, getDesignations, shiftService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";

export default function EditEmployeeModal({ employee, onClose, onUpdate, deptOptions = [], editMode = "all" }) {
  const [form, setForm] = useState({ ...employee });
  const [roles, setRoles] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [phoneSuffix, setPhoneSuffix] = useState("");

  useEffect(() => {
    fetchMasters();

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

  const fetchMasters = async () => {
    try {
      const [rolesData, typesData, desigData] = await Promise.all([
        roleService.getAll(),
        employeeTypeService.getAll(),
        getDesignations()
      ]);
      setRoles(rolesData);
      setContractTypes(typesData);
      setDesignations(desigData);
      const shiftsData = await shiftService.getAll();
      setShifts(shiftsData);
    } catch (error) {
      console.error("Failed to fetch masters", error);
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
    // Sanitize Payload: Convert "N/A" or empty dates to null
    const payload = { ...form };

    ["dob", "passportExpiry", "emiratesIdExpiry", "visaExpiry"].forEach(field => {
      if (payload[field] === "N/A" || payload[field] === "") {
        payload[field] = null;
      }
    });

    onUpdate(payload);
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
            {/* PRFOILE SECTION */}
            {(editMode === "all" || editMode === "profile") && (
              <>
                <div className="form-group">
                  <label>Employee Name</label>
                  <input name="name" value={form.name} onChange={handleChange} />
                </div>

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

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>On Leave</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Shift</label>
                  <select name="shift" onChange={handleChange} value={form.shift || ''}>
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s._id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* PERSONAL SECTION */}
            {(editMode === "all" || editMode === "personal") && (
              <>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" value={form.dob ? form.dob.slice(0, 10) : ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Nationality</label>
                  <input name="nationality" value={form.nationality || ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Personal ID (14 Digit)</label>
                  <input name="personalId" value={form.personalId || ''} onChange={handleChange} placeholder="e.g. 784-1234-1234567-1" />
                </div>

                <div className="form-group">
                  <label>UAE Address</label>
                  <input name="address" value={form.address || ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Passport Expiry</label>
                  <input type="date" name="passportExpiry" value={form.passportExpiry ? form.passportExpiry.slice(0, 10) : ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Emirates ID Expiry</label>
                  <input type="date" name="emiratesIdExpiry" value={form.emiratesIdExpiry ? form.emiratesIdExpiry.slice(0, 10) : ''} onChange={handleChange} />
                </div>
              </>
            )}
            {/* EMPLOYMENT SECTION */}
            {(editMode === "all" || editMode === "employment") && (
              <>
                <div className="form-group">
                  <label>Join Date</label>
                  <input type="date" name="joinDate" value={form.joinDate ? form.joinDate.slice(0, 10) : ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Employee Type</label>
                  <select name="contractType" value={form.contractType || ''} onChange={handleChange}>
                    <option value="">Select Employee Type</option>
                    {contractTypes.map((t) => (
                      <option key={t._id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select name="department" onChange={handleChange} value={form.department || ''}>
                    <option value="">Select Department</option>
                    {deptOptions.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <select name="designation" onChange={handleChange} value={form.designation || ''}>
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Labor Card No / Work Permit</label>
                  <input name="laborCardNumber" value={form.laborCardNumber || ''} onChange={handleChange} placeholder="e.g. 87654321" />
                </div>

                <div className="form-group">
                  <label>Agent ID (WPS)</label>
                  <input name="agentId" value={form.agentId || ''} onChange={handleChange} placeholder="e.g. AGENT001" />
                </div>

                <div className="form-group">
                  <label>Basic Salary</label>
                  <input name="basicSalary" value={form.basicSalary || ''} onChange={handleChange} placeholder="e.g. 15000" />
                </div>

                <div className="form-group">
                  <label>Accommodation</label>
                  <select name="accommodation" value={form.accommodation || ''} onChange={handleChange}>
                    <option value="">Select Option</option>
                    <option value="Company Provided">Company Provided</option>
                    <option value="Not Provided">Not Provided</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Visa Expiry</label>
                  <input type="date" name="visaExpiry" value={form.visaExpiry ? form.visaExpiry.slice(0, 10) : ''} onChange={handleChange} />
                </div>

                {/* Bank Details Header */}
                <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#374151' }}>Bank Details</h4>
                </div>

                <div className="form-group">
                  <label>Bank Name</label>
                  <input name="bankName" value={form.bankName || ''} onChange={handleChange} placeholder="e.g. FAB, ADCB" />
                </div>

                <div className="form-group">
                  <label>IBAN</label>
                  <input name="iban" value={form.iban || ''} onChange={handleChange} placeholder="AE..." />
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input name="bankAccount" value={form.bankAccount || ''} onChange={handleChange} />
                </div>
              </>
            )}
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
