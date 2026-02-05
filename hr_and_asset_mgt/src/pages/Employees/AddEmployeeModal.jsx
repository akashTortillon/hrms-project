import React, { useState, useEffect } from "react";
import { roleService, employeeTypeService, getDesignations, shiftService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";

export default function AddEmployeeModal({ onClose, onAddEmployee, deptOptions = [] }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    role: "",
    department: "",
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
    personalId: ""
  });
  const [roles, setRoles] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    fetchMasters();
  }, []);

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

  const handleSubmit = () => {
    const { name, role, department, designation, contractType, email, phone, joinDate } = form;

    if (!name || !role || !department || !email || !phone || !joinDate || !designation || !contractType) {
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
              <CustomSelect
                name="role"
                value={form.role}
                onChange={(val) => handleChange({ target: { name: 'role', value: val } })}
                options={[
                  { value: "", label: "Select Role" },
                  ...roles.map(r => ({ value: r.name, label: r.name }))
                ]}
                placeholder="Select Role"
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <CustomSelect
                name="department"
                value={form.department}
                onChange={(val) => handleChange({ target: { name: 'department', value: val } })}
                options={[
                  { value: "", label: "Select Department" },
                  ...deptOptions.map(dept => ({ value: dept, label: dept }))
                ]}
                placeholder="Select Department"
              />
            </div>

            <div className="form-group">
              <label>Designation</label>
              <CustomSelect
                name="designation"
                value={form.designation}
                onChange={(val) => handleChange({ target: { name: 'designation', value: val } })}
                options={[
                  { value: "", label: "Select Designation" },
                  ...designations.map(d => ({ value: d.name, label: d.name }))
                ]}
                placeholder="Select Designation"
              />
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
              <CustomSelect
                name="status"
                value={form.status || "Onboarding"}
                onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                options={[
                  { value: "Onboarding", label: "Onboarding" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "On Leave", label: "On Leave" }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Shift</label>
              <CustomSelect
                name="shift"
                value={form.shift}
                onChange={(val) => handleChange({ target: { name: 'shift', value: val } })}
                options={[
                  { value: "", label: "Select Shift" },
                  ...shifts.map(s => ({ value: s.name, label: s.name }))
                ]}
                placeholder="Select Shift"
              />
            </div>

            {/* Employment Details */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Employment Details</h4>
            </div>

            <div className="form-group">
              <label>Joining Date</label>
              <CustomDatePicker name="joinDate" value={form.joinDate} onChange={handleChange} placeholder="Select Date" />
            </div>

            <div className="form-group">
              <label>Employee Type</label>
              <CustomSelect
                name="contractType"
                value={form.contractType}
                onChange={(val) => handleChange({ target: { name: 'contractType', value: val } })}
                options={[
                  { value: "", label: "Select Employee Type" },
                  ...contractTypes.map(t => ({ value: t.name, label: t.name }))
                ]}
                placeholder="Select Employee Type"
              />
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
              <CustomSelect
                name="accommodation"
                value={form.accommodation}
                onChange={(val) => handleChange({ target: { name: 'accommodation', value: val } })}
                options={[
                  { value: "", label: "Select Option" },
                  { value: "Company Provided", label: "Company Provided" },
                  { value: "Not Provided", label: "Not Provided" }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Visa Expiry</label>
              <CustomDatePicker name="visaExpiry" value={form.visaExpiry} onChange={handleChange} placeholder="Select Date" />
            </div>

            {/* Personal Info */}
            <div className="form-group full-width" style={{ gridColumn: '1 / -1', margin: '15px 0 10px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px' }}>Personal Information</h4>
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <CustomDatePicker name="dob" value={form.dob} onChange={handleChange} placeholder="Select Date" />
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
              <CustomDatePicker name="passportExpiry" value={form.passportExpiry} onChange={handleChange} placeholder="Select Date" />
            </div>

            <div className="form-group">
              <label>Emirates ID Expiry</label>
              <CustomDatePicker name="emiratesIdExpiry" value={form.emiratesIdExpiry} onChange={handleChange} placeholder="Select Date" />
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
