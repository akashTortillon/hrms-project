import React, { useMemo, useState, useEffect } from "react";
import { roleService, employeeTypeService, getDesignations, shiftService, getBranches } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";
import { toast } from "react-toastify";
import {
  WORKING_DAY_TYPE_OPTIONS,
  WORKING_DAY_TYPE_PRESETS,
  WEEKDAY_CHECKBOXES,
} from "../../constants/workingDays";


export default function AddEmployeeModal({ onClose, onAddEmployee, deptOptions = [] }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    role: "",
    department: "",
    branch: "",
    designation: "",
    contractType: "",
    email: "",
    phone: "",
    joinDate: "",
    status: "Onboarding",
    dob: "",
    nationality: "",
    address: "",
    passportExpiry: "",
    emiratesIdExpiry: "",
    basicSalary: "",
    accommodation: "",
    visaExpiry: "",
    shift: "",
    laborCardNumber: "",
    agentId: "",
    bankName: "",
    iban: "",
    bankAccount: "",
    personalId: "",
    workingDayType: 4,
    weeklyOffDays: [0],
  });
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [roles, setRoles] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const [rolesData, typesData, desigData, branchesData] = await Promise.all([
        roleService.getAll(),
        employeeTypeService.getAll(),
        getDesignations(),
        getBranches()
      ]);
      setRoles(rolesData);
      setContractTypes(typesData);
      setDesignations(desigData);
      setBranchesList(branchesData);

      const shiftsData = await shiftService.getAll();
      setShifts(shiftsData);
    } catch (error) {
      console.error("Failed to fetch masters", error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const markTouched = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const validate = (values) => {
    const nextErrors = {};

    const name = values.name?.trim() ?? "";
    const role = values.role?.trim() ?? "";
    const department = values.department?.trim() ?? "";
    const email = values.email?.trim() ?? "";
    const joinDate = values.joinDate ?? "";
    const phone = values.phone?.trim() ?? "";

    if (!name) nextErrors.name = "Employee Name is required";
    if (!role) nextErrors.role = "Role is required";
    if (!department) nextErrors.department = "Department is required";
    if (!joinDate) nextErrors.joinDate = "Joining Date is required";

    if (!email) {
      nextErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) nextErrors.email = "Please enter a valid email address";
    }

    if (!phone) {
      nextErrors.phone = "Phone Number is required";
    } else {
      const digits = phone.replace(/\D/g, "");
      const looksLikeUae = digits.startsWith("971") && digits.length === 12; // 971 + 9 digits
      if (!looksLikeUae) nextErrors.phone = "Please enter a valid UAE phone number";
    }

    return nextErrors;
  };

  const errors = useMemo(() => validate(form), [form]);

  const isInvalid = (fieldName) => {
    const shouldShow = Boolean(submitAttempted || touched[fieldName]);
    return shouldShow && Boolean(errors[fieldName]);
  };

  const fieldClassName = (fieldName) => (isInvalid(fieldName) ? "invalid" : "");

  const handleWorkingDayTypeChange = (e) => {
    const t = parseInt(e.target.value, 10);
    const preset = WORKING_DAY_TYPE_PRESETS[t] ?? WORKING_DAY_TYPE_PRESETS[4];
    setForm({ ...form, workingDayType: t, weeklyOffDays: [...preset] });
  };

  const toggleWeeklyOffDay = (day) => {
    const set = new Set(form.weeklyOffDays || []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setForm({ ...form, weeklyOffDays: [...set].sort((a, b) => a - b) });
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched((prev) => ({
      ...prev,
      name: true,
      role: true,
      department: true,
      email: true,
      phone: true,
      joinDate: true,
    }));

    // Keep UI validation aligned with backend `addEmployee` required fields.
    // Backend requires: name, role, department, joinDate, valid email, valid phone.
    if (Object.keys(errors).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    onAddEmployee({
      ...form,
      workingDayType: parseInt(form.workingDayType, 10),
      weeklyOffDays: Array.isArray(form.weeklyOffDays) ? form.weeklyOffDays : [],
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
              <label>
                Employee Name <span className="required-asterisk">*</span>
              </label>
              <input
                className={fieldClassName("name")}
                name="name"
                placeholder="Enter Full Name"
                value={form.name}
                onChange={handleChange}
                onBlur={() => markTouched("name")}
              />
              {isInvalid("name") ? <div className="field-error">{errors.name}</div> : null}
            </div>

            <div className="form-group">
              <label>Employee ID (Optional)</label>
              <input
                name="code"
                placeholder="e.g. 10172 (leave blank to auto-generate)"
                value={form.code}
                onChange={(e) => {
                  const val = e.target.value || "";
                  // Allow numeric or alphanumeric employee ID (no spaces/special chars)
                  const alphaNumeric = val.replace(/[^a-zA-Z0-9]/g, "");
                  setForm((prev) => ({ ...prev, code: alphaNumeric }));
                }}
              />
            </div>

            <div className="form-group">
              <label>
                Role <span className="required-asterisk">*</span>
              </label>
              <select
                className={fieldClassName("role")}
                name="role"
                value={form.role}
                onChange={handleChange}
                onBlur={() => markTouched("role")}
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
              {isInvalid("role") ? <div className="field-error">{errors.role}</div> : null}
            </div>

            <div className="form-group">
              <label>
                Department <span className="required-asterisk">*</span>
              </label>
              <select
                className={fieldClassName("department")}
                name="department"
                value={form.department}
                onChange={handleChange}
                onBlur={() => markTouched("department")}
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
              {isInvalid("department") ? <div className="field-error">{errors.department}</div> : null}
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
              <label>
                Email <span className="required-asterisk">*</span>
              </label>
              <input
                className={fieldClassName("email")}
                name="email"
                placeholder="email@company.com"
                type="email"
                value={form.email}
                onChange={handleChange}
                onBlur={() => markTouched("email")}
              />
              {isInvalid("email") ? <div className="field-error">{errors.email}</div> : null}
            </div>

            <div className="form-group">
              <label>
                Phone Number <span className="required-asterisk">*</span>
              </label>
              <div
                className={`phone-input-wrapper ${isInvalid("phone") ? "invalid" : ""}`}
                style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: '#f9fafb' }}
              >
                <span style={{ padding: '0 12px', background: '#e5e7eb', color: '#374151', fontSize: '14px', fontWeight: '600', height: '44px', display: 'flex', alignItems: 'center' }}>+971</span>
                <input
                  name="phoneSuffix"
                  placeholder="50 123 4567"
                  value={(form.phone || "").startsWith("+971") ? (form.phone || "").replace("+971", "") : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(prev => ({ ...prev, phone: `+971${val}` }));
                  }}
                  onBlur={() => markTouched("phone")}
                  style={{ border: 'none', boxShadow: 'none', background: 'transparent', height: '44px' }}
                />
              </div>
              {isInvalid("phone") ? <div className="field-error">{errors.phone}</div> : null}
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

            <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
              <label>Working day type (preset)</label>
              <select
                value={form.workingDayType}
                onChange={handleWorkingDayTypeChange}
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
                {WORKING_DAY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                Weekly off days (edit per employee — any weekday)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {WEEKDAY_CHECKBOXES.map(({ day, label }) => (
                  <label key={day} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(form.weeklyOffDays || []).includes(day)}
                      onChange={() => toggleWeeklyOffDay(day)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Details */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Employment Details</h4>
            </div>

            <div className="form-group">
              <label>
                Joining Date <span className="required-asterisk">*</span>
              </label>
              <input
                className={fieldClassName("joinDate")}
                type="date"
                name="joinDate"
                value={form.joinDate}
                onChange={handleChange}
                onBlur={() => markTouched("joinDate")}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  height: "42px"
                }}
              />
              {isInvalid("joinDate") ? <div className="field-error">{errors.joinDate}</div> : null}
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

            <div className="form-group">
              <label>Labor Card No</label>
              <input name="laborCardNumber" placeholder="e.g. 876321" onChange={handleChange} />
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
              <label>Passport Expiry</label>
              <input
                type="date"
                name="passportExpiry"
                value={form.passportExpiry}
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
