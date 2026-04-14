import React, { useState, useEffect } from "react";
import { roleService, employeeTypeService, getDesignations, shiftService, getBranches, getCompanies } from "../../services/masterService";
import { getEmployees } from "../../services/employeeService";
import "../../style/AddEmployeeModal.css";


export default function EditEmployeeModal({ employee, onClose, onUpdate, deptOptions = [], editMode = "all" }) {
  const [form, setForm] = useState({ ...employee });
  const [roles, setRoles] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [managers, setManagers] = useState([]);
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

    setForm((prev) => ({
      ...prev,
      laborCards: Array.isArray(employee.laborCards) && employee.laborCards.length
        ? employee.laborCards.map((item, index) => ({
          number: item.number || "",
          expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : "",
          issueDate: item.issueDate ? String(item.issueDate).slice(0, 10) : "",
          notes: item.notes || "",
          isPrimary: index === 0
        }))
        : [{ number: employee.laborCardNumber || "", expiryDate: "", issueDate: "", notes: "", isPrimary: true }]
    }));
  }, [employee]);

  // Handle auto-calculation of Total Salary
  useEffect(() => {
    const basic = Number(form.basicSalary) || 0;
    const allowance = Number(form.allowance) || 0;
    const hra = Number(form.hra) || 0;
    const accommodation = Number(form.accommodationAllowance) || 0;
    const vehicle = Number(form.vehicleAllowance) || 0;
    
    setForm(prev => ({
      ...prev,
      totalSalary: basic + allowance + hra + accommodation + vehicle
    }));
  }, [form.basicSalary, form.allowance, form.hra, form.accommodationAllowance, form.vehicleAllowance]);

  const fetchMasters = async () => {
    try {
      const [rolesData, typesData, desigData, branchesData, companiesData, employeesData] = await Promise.all([
        roleService.getAll(),
        employeeTypeService.getAll(),
        getDesignations(),
        getBranches(),
        getCompanies(),
        getEmployees()
      ]);
      setRoles(rolesData);
      setContractTypes(typesData);
      setDesignations(desigData);
      setBranchesList(branchesData);
      setCompanies(companiesData);
      setManagers(Array.isArray(employeesData) ? employeesData : []);
      const shiftsData = await shiftService.getAll();
      setShifts(shiftsData);
    } catch (error) {
      console.error("Failed to fetch masters", error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLaborCardChange = (index, field, value) => {
    setForm((prev) => {
      const nextCards = [...(prev.laborCards || [])];
      nextCards[index] = {
        ...nextCards[index],
        [field]: value,
        isPrimary: index === 0
      };
      return { ...prev, laborCards: nextCards };
    });
  };

  const addLaborCard = () => {
    setForm((prev) => ({
      ...prev,
      laborCards: [
        ...(Array.isArray(prev.laborCards) ? prev.laborCards : []),
        { number: "", expiryDate: "", issueDate: "", notes: "", isPrimary: false }
      ]
    }));
  };

  const removeLaborCard = (index) => {
    setForm((prev) => {
      const nextCards = (prev.laborCards || []).filter((_, cardIndex) => cardIndex !== index);
      return {
        ...prev,
        laborCards: nextCards.length
          ? nextCards.map((card, cardIndex) => ({ ...card, isPrimary: cardIndex === 0 }))
          : [{ number: "", expiryDate: "", issueDate: "", notes: "", isPrimary: true }]
      };
    });
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

    payload.laborCards = (payload.laborCards || [])
      .filter((item) => item && item.number?.trim())
      .map((item, index) => ({
        number: item.number.trim(),
        expiryDate: item.expiryDate || "",
        issueDate: item.issueDate || "",
        notes: item.notes || "",
        isPrimary: index === 0
      }));
    payload.laborCardNumber = payload.laborCards[0]?.number || payload.laborCardNumber || "";

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
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Role</option>
                    {roles.map(r => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Department</option>
                    {deptOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Branch</label>
                  <select
                    name="branch"
                    value={form.branch || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Branch</option>
                    {branchesList.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Company</label>
                  <select
                    name="company"
                    value={form.company || ''}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c._id || c.name} value={c.name}>{c.name}</option>
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
                  <input
                    type="date"
                    name="joinDate"
                    value={form.joinDate ? form.joinDate.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div style={{ width: '100%' }}>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "white",
                        fontSize: "14px",
                        height: "42px"
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Shift</label>
                  <select
                    name="shift"
                    value={form.shift || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Shift</option>
                    {shifts.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Designated Manager</label>
                  <select
                    name="designatedManager"
                    value={form.designatedManager || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Manager</option>
                    {managers.map(manager => (
                      <option key={manager._id} value={manager._id}>{manager.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Finance Manager</label>
                  <select
                    name="designatedFinanceManager"
                    value={form.designatedFinanceManager || ''}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
                  >
                    <option value="">Select Finance Manager</option>
                    {managers.map(manager => (
                      <option key={`finance-basic-${manager._id}`} value={manager._id}>{manager.name}</option>
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
                  <input
                    type="date"
                    name="dob"
                    value={form.dob ? form.dob.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
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
                  <input
                    type="date"
                    name="passportExpiry"
                    value={form.passportExpiry ? form.passportExpiry.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Emirates ID Expiry</label>
                  <input
                    type="date"
                    name="emiratesIdExpiry"
                    value={form.emiratesIdExpiry ? form.emiratesIdExpiry.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
                </div>
              </>
            )}
            {/* EMPLOYMENT SECTION */}
            {(editMode === "all" || editMode === "employment") && (
              <>
                <div className="form-group">
                  <label>Join Date</label>
                  <input
                    type="date"
                    name="joinDate"
                    value={form.joinDate ? form.joinDate.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Employee Type</label>
                  <select
                    name="contractType"
                    value={form.contractType || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Employee Type</option>
                    {contractTypes.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={form.department || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Department</option>
                    {deptOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Branch</label>
                  <select
                    name="branch"
                    value={form.branch || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Branch</option>
                    {branchesList.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <select
                    name="designation"
                    value={form.designation || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width employee-labor-section">
                  <div className="employee-section-row">
                    <label className="employee-section-heading">Labour Cards</label>
                    <button type="button" className="employee-add-inline-btn" onClick={addLaborCard}>
                      + Add Card
                    </button>
                  </div>

                  <div className="employee-labor-card-list">
                    {(form.laborCards || []).map((card, index) => (
                      <div className="employee-labor-card" key={`edit-labor-card-${index}`}>
                        <div className="employee-labor-card-top">
                          <span>Card {index + 1}</span>
                          {(form.laborCards || []).length > 1 && (
                            <button
                              type="button"
                              className="employee-remove-inline-btn"
                              onClick={() => removeLaborCard(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="employee-labor-grid">
                          <div className="form-group">
                            <label>Labor Card No {index + 1}</label>
                            <input
                              value={card.number || ""}
                              onChange={(e) => handleLaborCardChange(index, "number", e.target.value)}
                              placeholder="Enter Card No"
                            />
                          </div>

                          <div className="form-group">
                            <label>Expiry Date</label>
                            <input
                              type="date"
                              value={card.expiryDate || ""}
                              onChange={(e) => handleLaborCardChange(index, "expiryDate", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <label>Allowance</label>
                  <input name="allowance" type="number" value={form.allowance || ''} onChange={handleChange} placeholder="e.g. 500" />
                </div>

                <div className="form-group">
                  <label>HRA</label>
                  <input name="hra" type="number" value={form.hra || ''} onChange={handleChange} placeholder="e.g. 300" />
                </div>

                <div className="form-group">
                  <label>Accommodation Allowance (AED)</label>
                  <input name="accommodationAllowance" type="number" value={form.accommodationAllowance || ''} onChange={handleChange} placeholder="e.g. 500" />
                </div>

                <div className="form-group">
                  <label>Vehicle Allowance (AED)</label>
                  <input name="vehicleAllowance" type="number" value={form.vehicleAllowance || ''} onChange={handleChange} placeholder="e.g. 400" />
                </div>

                <div className="form-group">
                  <label>Total Salary (AED)</label>
                  <input name="totalSalary" type="number" value={form.totalSalary || ''} onChange={handleChange} placeholder="Auto calculated" />
                </div>

                <div className="form-group">
                  <label>Visa Base</label>
                  <input name="visaBase" value={form.visaBase || ''} onChange={handleChange} placeholder="Payroll basis" />
                </div>

                <div className="form-group">
                  <label>Work Base</label>
                  <input name="workBase" value={form.workBase || ''} onChange={handleChange} placeholder="Internal work base" />
                </div>

                <div className="form-group">
                  <label>CTC</label>
                  <input name="ctc" value={form.ctc || ''} onChange={handleChange} placeholder="Optional CTC" />
                </div>

                <div className="form-group">
                  <label>Accommodation</label>
                  <select
                    name="accommodation"
                    value={form.accommodation || ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  >
                    <option value="">Select Option</option>
                    <option value="Company Provided">Company Provided</option>
                    <option value="Not Provided">Not Provided</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Visa Company</label>
                  <input name="visaCompany" value={form.visaCompany || ''} onChange={handleChange} placeholder="Company on visa" />
                </div>

                <div className="form-group">
                  <label>Work Permit Company</label>
                  <input name="workPermitCompany" value={form.workPermitCompany || ''} onChange={handleChange} placeholder="Company on work permit" />
                </div>

                <div className="form-group">
                  <label>Visa No</label>
                  <input name="visaNo" value={form.visaNo || ''} onChange={handleChange} placeholder="Enter visa number" />
                </div>

                <div className="form-group">
                  <label>Visa File No</label>
                  <input name="visaFileNo" value={form.visaFileNo || ''} onChange={handleChange} placeholder="Enter visa file number" />
                </div>

                <div className="form-group">
                  <label>Visa Expiry</label>
                  <input
                    type="date"
                    name="visaExpiry"
                    value={form.visaExpiry ? form.visaExpiry.slice(0, 10) : ''}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      height: "42px"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Designated Manager</label>
                  <select
                    name="designatedManager"
                    value={form.designatedManager || ''}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
                  >
                    <option value="">Select Manager</option>
                    {managers.map(manager => (
                      <option key={manager._id} value={manager._id}>{manager.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Finance Manager</label>
                  <select
                    name="designatedFinanceManager"
                    value={form.designatedFinanceManager || ''}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
                  >
                    <option value="">Select Finance Manager</option>
                    {managers.map(manager => (
                      <option key={`finance-employment-${manager._id}`} value={manager._id}>{manager.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Probation Start Date</label>
                  <input type="date" name="probationStartDate" value={form.probationStartDate ? form.probationStartDate.slice(0, 10) : ''} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }} />
                </div>

                <div className="form-group">
                  <label>Probation End Date</label>
                  <input type="date" name="probationEndDate" value={form.probationEndDate ? form.probationEndDate.slice(0, 10) : ''} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }} />
                </div>

                <div className="form-group">
                  <label>Fixed Probation Increment</label>
                  <input name="fixedProbationIncrementAmount" value={form.fixedProbationIncrementAmount || ''} onChange={handleChange} placeholder="e.g. 500" />
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
