import React, { useState, useEffect } from "react";
import { roleService, employeeTypeService, getDesignations, shiftService, getBranches, getCompanies } from "../../services/masterService";
import { getEmployees } from "../../services/employeeService";
import "../../style/AddEmployeeModal.css";


export default function AddEmployeeModal({ onClose, onAddEmployee, deptOptions = [] }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    role: "",
    department: "",
    branch: "",
    company: "",
    designation: "",
    contractType: "",
    email: "",
    phone: "",
    joinDate: "",
    status: "Onboarding",
    dob: "",
    nationality: "",
    address: "",
    passportNo: "",
    passportExpiry: "",
    emiratesIdNo: "",
    emiratesIdExpiry: "",
    basicSalary: "",
    allowance: "",
    hra: "",
    accommodationAllowance: "",
    vehicleAllowance: "",
    totalSalary: "",
    accommodation: "",
    visaNo: "",
    visaFileNo: "",
    visaExpiry: "",
    visaCompany: "",
    workPermitCompany: "",
    visaBase: "",
    workBase: "",
    ctc: "",
    shift: "",
    laborCardNumber: "",
    laborCards: [{ number: "", expiryDate: "", issueDate: "", notes: "", isPrimary: true }],
    agentId: "",
    bankName: "",
    iban: "",
    bankAccount: "",
    personalId: "",
    designatedManager: "",
    designatedFinanceManager: "",
    probationStartDate: "",
    probationEndDate: "",
    fixedProbationIncrementAmount: ""
  });
  const [roles, setRoles] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchMasters();
  }, []);

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
      const nextCards = [...prev.laborCards];
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

  const handleSubmit = () => {
    const { name, role, department, email, phone, joinDate } = form;

    if (!name || !role || !department || !email || !phone || !joinDate) {
      alert("Name, role, department, email, phone and joining date are required");
      return;
    }

    const laborCards = (form.laborCards || [])
      .filter((item) => item && item.number?.trim())
      .map((item, index) => ({
        number: item.number.trim(),
        expiryDate: item.expiryDate || "",
        issueDate: item.issueDate || "",
        notes: item.notes || "",
        isPrimary: index === 0
      }));

    onAddEmployee({
      ...form,
      laborCards,
      laborCardNumber: laborCards[0]?.number || form.laborCardNumber,
      probationStartDate: form.probationStartDate || form.joinDate
    });
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
            {/* Basic Info */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Basic Information</h4>
            </div>

            <div className="form-group">
              <label>Employee Name</label>
              <input name="name" placeholder="Enter Full Name" onChange={handleChange} />
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
              <label>Finance Manager</label>
              <select
                name="designatedFinanceManager"
                value={form.designatedFinanceManager}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
              >
                <option value="">Select Finance Manager</option>
                {managers.map(manager => (
                  <option key={`finance-${manager._id}`} value={manager._id}>{manager.name}</option>
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
                value={form.branch}
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
                value={form.company}
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
              <label>Designation</label>
              <select
                name="designation"
                value={form.designation}
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
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(prev => ({ ...prev, phone: `+971${val}` }));
                  }}
                  style={{ border: 'none', boxShadow: 'none', background: 'transparent', height: '44px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={form.status || "Onboarding"}
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
                <option value="Onboarding">Onboarding</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            <div className="form-group">
              <label>Shift</label>
              <select
                name="shift"
                value={form.shift}
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

            {/* Employment Details */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Employment Details</h4>
            </div>

            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                name="joinDate"
                value={form.joinDate}
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
                value={form.contractType}
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

            <div className="form-group full-width employee-labor-section">
              <div className="employee-section-row">
                <label className="employee-section-heading">Labour Cards</label>
                <button type="button" className="employee-add-inline-btn" onClick={addLaborCard}>
                  + Add Card
                </button>
              </div>

              <div className="employee-labor-card-list">
                {(form.laborCards || []).map((card, index) => (
                  <div className="employee-labor-card" key={`labor-card-${index}`}>
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
                          placeholder="Enter Card No"
                          onChange={(e) => handleLaborCardChange(index, "number", e.target.value)}
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
              <input name="agentId" placeholder="e.g. AGENT001" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Basic Salary (AED)</label>
              <input name="basicSalary" placeholder="e.g. 15000" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Allowance (AED)</label>
              <input name="allowance" type="number" placeholder="e.g. 500" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>HRA (AED)</label>
              <input name="hra" type="number" placeholder="e.g. 300" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Accommodation Allowance (AED)</label>
              <input name="accommodationAllowance" type="number" placeholder="e.g. 500" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Vehicle Allowance (AED)</label>
              <input name="vehicleAllowance" type="number" placeholder="e.g. 400" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Total Salary (AED)</label>
              <input
                name="totalSalary"
                type="number"
                placeholder="Auto or manual"
                value={form.totalSalary}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Visa Base (AED)</label>
              <input name="visaBase" placeholder="Payroll basis" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Work Base (AED)</label>
              <input name="workBase" placeholder="Internal work base" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>CTC (AED)</label>
              <input name="ctc" placeholder="Optional CTC" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Accommodation</label>
              <select
                name="accommodation"
                value={form.accommodation}
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
              <label>Visa Expiry</label>
              <input
                type="date"
                name="visaExpiry"
                value={form.visaExpiry}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }}
              />
            </div>

            {/* Visa & Work Permit */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Visa & Work Permit</h4>
            </div>

            <div className="form-group">
              <label>Visa Number</label>
              <input name="visaNo" placeholder="e.g. 201/2023/12345" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Visa File Number</label>
              <input name="visaFileNo" placeholder="e.g. 10100/2023" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Visa Company</label>
              <select
                name="visaCompany"
                value={form.visaCompany}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
              >
                <option value="">Select Visa Company</option>
                {companies.map(c => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Work Permit Company</label>
              <select
                name="workPermitCompany"
                value={form.workPermitCompany}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", height: "42px" }}
              >
                <option value="">Select Work Permit Company</option>
                {companies.map(c => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Designated Manager</label>
              <select
                name="designatedManager"
                value={form.designatedManager}
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
              <label>Probation Start Date</label>
              <input type="date" name="probationStartDate" value={form.probationStartDate} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }} />
            </div>

            <div className="form-group">
              <label>Probation End Date</label>
              <input type="date" name="probationEndDate" value={form.probationEndDate} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }} />
            </div>

            <div className="form-group">
              <label>Fixed Probation Increment</label>
              <input name="fixedProbationIncrementAmount" value={form.fixedProbationIncrementAmount} placeholder="e.g. 500" onChange={handleChange} />
            </div>

            {/* Personal Info */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Personal Information</h4>
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
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
              <label>Personal ID (14 Digit)</label>
              <input name="personalId" placeholder="e.g. 784-1990..." onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Nationality</label>
              <input name="nationality" placeholder="e.g. Indian" onChange={handleChange} />
            </div>

            <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
              <label>UAE Address</label>
              <input name="address" placeholder="e.g. Dubai Marina" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Passport Number</label>
              <input name="passportNo" placeholder="e.g. A1234567" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Passport Expiry</label>
              <input
                type="date"
                name="passportExpiry"
                value={form.passportExpiry}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", height: "42px" }}
              />
            </div>

            <div className="form-group">
              <label>Emirates ID Number</label>
              <input name="emiratesIdNo" placeholder="e.g. 784-1990-1234567-8" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Emirates ID Expiry</label>
              <input
                type="date"
                name="emiratesIdExpiry"
                value={form.emiratesIdExpiry}
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

            {/* Bank Details */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Bank Information</h4>
            </div>

            <div className="form-group">
              <label>Bank Name</label>
              <input name="bankName" placeholder="e.g. FAB" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>IBAN</label>
              <input name="iban" placeholder="AE..." onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Account Number</label>
              <input name="bankAccount" placeholder="1234567890" onChange={handleChange} />
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
