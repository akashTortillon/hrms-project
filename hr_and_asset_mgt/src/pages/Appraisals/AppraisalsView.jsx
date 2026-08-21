import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";
import { getEmployees } from "../../services/employeeService";
import { appraisalService } from "../../services/appraisalService";
import { getSettings } from "../../services/systemSettingsService";
import "../../style/Appraisals.css";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} AED`;
};

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toISOString().slice(0, 10);
};

// Was employee.visaBase || employee.basicSalary. visaBase is a separate
// compliance/labour-filing figure, allowed to diverge from real gross pay (see the
// CTC popup's own "Payroll Base (Visa Base)" vs "Gross Earnings" split) - any employee
// whose salary was ever set via a direct Edit rather than an Appraisal increment has a
// stale visaBase, since only the increment path keeps it in lockstep. Showing it here
// as "Current Base Salary" let this preview show a number completely disconnected from
// totalSalary, which is what the increment approval actually operates on.
const getBaseSalary = (employee) =>
  Number(employee?.totalSalary || employee?.basicSalary || 0);

const getEmployeeLabel = (employee) => {
  if (!employee) return "";
  return employee.code
    ? `${employee.name} (${employee.code})`
    : employee.name;
};

// Increments most commonly need to take effect on the 1st of next month rather than
// immediately, so default the picker there instead of "today" — still fully editable.
const getDefaultEffectiveDate = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().slice(0, 10);
};

const isFutureDate = (dateStr) => {
  if (!dateStr) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(dateStr) > endOfToday;
};

export default function AppraisalsView() {
  const { hasPermission } = useRole();
  const canManageAppraisals = hasPermission("MANAGE_APPRAISALS");

  const [employees, setEmployees] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [incrementAmount, setIncrementAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getDefaultEffectiveDate());
  const [adjustmentMode, setAdjustmentMode] = useState("SALARY"); // "SALARY" | "ALLOWANCE"
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [selectedAllowanceType, setSelectedAllowanceType] = useState("");
  // "Include in Payroll" toggle — only relevant for ALLOWANCE mode.
  // When true (default) the allowance is picked up by payroll generation automatically.
  // When false it is stored for record-keeping only and excluded from payroll runs.
  const [includeInPayroll, setIncludeInPayroll] = useState(true);
  const [companyFilter, setCompanyFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("APPROVED");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (preferredEmployeeId = "") => {
    try {
      setLoading(true);
      const [employeeData, appraisalData, settingsData] = await Promise.all([
        getEmployees(),
        appraisalService.getAll(),
        getSettings()
      ]);

      setEmployees(employeeData);
      setAppraisals(appraisalData);
      setAllowanceTypes(settingsData?.allowanceTypes || []);

      const employeeExists = employeeData.some((employee) => employee._id === preferredEmployeeId);
      if (employeeExists) {
        setSelectedEmployeeId(preferredEmployeeId);
        const matchedEmployee = employeeData.find((employee) => employee._id === preferredEmployeeId);
        setEmployeeSearch(getEmployeeLabel(matchedEmployee));
      } else if (!selectedEmployeeId && employeeData.length) {
        setSelectedEmployeeId(employeeData[0]._id);
        setEmployeeSearch(getEmployeeLabel(employeeData[0]));
      } else if (!employeeData.length) {
        setSelectedEmployeeId("");
        setEmployeeSearch("");
      }
    } catch {
      toast.error("Failed to load increment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEmployee = employees.find((employee) => employee._id === selectedEmployeeId) || null;
  const isAllowanceMode = adjustmentMode === "ALLOWANCE";
  const currentAllowanceAmount = selectedEmployee
    ? Number((selectedEmployee.allowances || []).find((item) => item.typeName === selectedAllowanceType)?.amount || 0)
    : 0;
  const currentBaseSalary = isAllowanceMode ? currentAllowanceAmount : getBaseSalary(selectedEmployee);
  const parsedIncrement = Number(String(incrementAmount || 0).replace(/[^0-9.-]+/g, ""));
  const nextSalary = currentBaseSalary + (Number.isFinite(parsedIncrement) ? parsedIncrement : 0);

  const getUniqueOptions = (items, key) =>
    Array.from(new Set(items.map((item) => item?.[key]).filter(Boolean))).sort();

  const companyOptions = getUniqueOptions(employees, "company");
  const branchOptions = getUniqueOptions(
    employees.filter((employee) => !companyFilter || employee.company === companyFilter),
    "branch"
  );
  const departmentOptions = getUniqueOptions(
    employees.filter((employee) =>
      (!companyFilter || employee.company === companyFilter) &&
      (!branchFilter || employee.branch === branchFilter)
    ),
    "department"
  );

  const historyRows = appraisals
    .filter((appraisal) => {
      const employee = appraisal.employee || {};
      const matchesEmployee = !selectedEmployeeId || employee._id === selectedEmployeeId;
      const matchesCompany = !companyFilter || employee.company === companyFilter;
      const matchesBranch = !branchFilter || employee.branch === branchFilter;
      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
      const matchesStatus = statusFilter === "ALL" || appraisal.status === statusFilter;

      return matchesEmployee && matchesCompany && matchesBranch && matchesDepartment && matchesStatus;
    })
    .sort((left, right) => new Date(right.effectiveDate) - new Date(left.effectiveDate));

  const applyIncrement = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (isAllowanceMode && !selectedAllowanceType) {
      toast.error("Please select an allowance type");
      return;
    }

    if (!Number.isFinite(parsedIncrement) || parsedIncrement <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!effectiveDate) {
      toast.error("Please select an effective date");
      return;
    }

    try {
      setSubmitting(true);

      await appraisalService.applyAdjustment({
        employee: selectedEmployeeId,
        type: isAllowanceMode ? "ALLOWANCE" : "SALARY",
        allowanceTypeName: isAllowanceMode ? selectedAllowanceType : "",
        amount: parsedIncrement,
        effectiveDate,
        includeInPayroll: isAllowanceMode ? includeInPayroll : true
      });

      setIncrementAmount("");
      setEffectiveDate(getDefaultEffectiveDate());
      if (isAllowanceMode) setIncludeInPayroll(true); // reset to safe default after submit
      await loadData(selectedEmployeeId);
      toast.success(
        isFutureDate(effectiveDate)
          ? `${isAllowanceMode ? "Allowance" : "Increment"} scheduled for ${effectiveDate}`
          : (isAllowanceMode ? "Allowance applied successfully" : "Increment applied successfully")
      );
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to apply adjustment";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="appraisal-prototype-page">
      <div className="appraisal-prototype-heading">
        <h2>Salary Increment &amp; Appraisal</h2>
        <p>Manage employee appraisals and track adjustment history</p>
      </div>

      {!canManageAppraisals && (
        <div className="appraisal-prototype-banner">
          You can view adjustment history here, but only HR/Admin users with appraisal permission can apply increments.
        </div>
      )}

      <div className="appraisal-prototype-grid">
        <section className="appraisal-panel appraisal-apply-panel">
          <div className="appraisal-panel-header">
            <span>{isAllowanceMode ? "Add / Increase Allowance" : "Apply Increment"}</span>
          </div>

          <div className="appraisal-panel-body">
            <div className="appraisal-mode-toggle">
              <button
                type="button"
                className={!isAllowanceMode ? "active" : ""}
                onClick={() => { setAdjustmentMode("SALARY"); setIncrementAmount(""); setIncludeInPayroll(true); }}
              >
                Salary Increment
              </button>
              <button
                type="button"
                className={isAllowanceMode ? "active" : ""}
                onClick={() => { setAdjustmentMode("ALLOWANCE"); setIncrementAmount(""); setIncludeInPayroll(true); }}
              >
                Allowance
              </button>
            </div>

            <label className="appraisal-field">
              <span>Search Employee</span>
              <div className="appraisal-search-box">
                <input
                  type="text"
                  list="appraisal-employee-options"
                  placeholder="Search by name, code, designation"
                  value={employeeSearch}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setEmployeeSearch(nextValue);
                    const matchedEmployee = employees.find(
                      (employee) => getEmployeeLabel(employee).toLowerCase() === nextValue.trim().toLowerCase()
                    );
                    if (matchedEmployee) {
                      setSelectedEmployeeId(matchedEmployee._id);
                    } else {
                      setSelectedEmployeeId("");
                    }
                  }}
                  disabled={loading || !employees.length}
                />
                <button
                  type="button"
                  className="appraisal-search-clear"
                  onClick={() => {
                    setSelectedEmployeeId("");
                    setEmployeeSearch("");
                  }}
                  disabled={loading}
                >
                  All
                </button>
              </div>
              <datalist id="appraisal-employee-options">
                {employees.map((employee) => (
                  <option key={employee._id} value={getEmployeeLabel(employee)}>
                    {[employee.code, employee.designation].filter(Boolean).join(" • ")}
                  </option>
                ))}
              </datalist>
            </label>

            {isAllowanceMode && (
              <label className="appraisal-field">
                <span>Allowance Type</span>
                <select
                  value={selectedAllowanceType}
                  onChange={(event) => setSelectedAllowanceType(event.target.value)}
                  disabled={!canManageAppraisals || submitting}
                >
                  <option value="">Select allowance type</option>
                  {allowanceTypes.map((allowanceType) => (
                    <option key={allowanceType._id} value={allowanceType.name}>
                      {allowanceType.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isAllowanceMode && (
              <div className="appraisal-toggle-row">
                <div className="appraisal-toggle-label-group">
                  <span className="appraisal-toggle-label">Include in Payroll</span>
                  <span className="appraisal-toggle-hint">
                    {includeInPayroll
                      ? "This allowance will be added to the employee's monthly payroll automatically."
                      : "This allowance will be saved for record-keeping only and excluded from payroll runs."}
                  </span>
                </div>
                <button
                  id="appraisal-include-in-payroll-toggle"
                  type="button"
                  role="switch"
                  aria-checked={includeInPayroll}
                  className={`appraisal-toggle-switch${includeInPayroll ? " is-on" : ""}`}
                  onClick={() => setIncludeInPayroll((prev) => !prev)}
                  disabled={!canManageAppraisals || submitting}
                >
                  <span className="appraisal-toggle-thumb" />
                  <span className="appraisal-toggle-text">{includeInPayroll ? "ON" : "OFF"}</span>
                </button>
              </div>
            )}

            <div className="appraisal-salary-box">
              <span className="appraisal-salary-label">
                {isAllowanceMode ? "Current Allowance Amount" : "Current Base Salary"}
              </span>
              <strong>{selectedEmployee ? formatCurrency(currentBaseSalary) : "--"}</strong>
            </div>

            <label className="appraisal-field">
              <span>{isAllowanceMode ? "Increase Amount" : "Increment Amount"}</span>
              <div className="appraisal-currency-input">
                <span>AED</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={incrementAmount}
                  onChange={(event) => setIncrementAmount(event.target.value)}
                  disabled={!canManageAppraisals || submitting}
                />
              </div>
            </label>

            <label className="appraisal-field">
              <span>Effective Date</span>
              <input
                type="date"
                value={effectiveDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                disabled={!canManageAppraisals || submitting}
              />
              {isFutureDate(effectiveDate) && (
                <span className="appraisal-toggle-hint">
                  This {isAllowanceMode ? "allowance" : "increment"} will take effect on {effectiveDate} — the employee's current {isAllowanceMode ? "allowance" : "salary"} won't change until then.
                </span>
              )}
            </label>

            <div className="appraisal-next-salary">
              <span>{isAllowanceMode ? "New Allowance Amount" : "New Salary"}</span>
              <strong>{selectedEmployee ? formatCurrency(nextSalary) : "--"}</strong>
            </div>

            {/* Preview of approveAppraisal's actual gross-first-split math (see
                splitIncrement in salaryCalc.js) so the split is visible before
                confirming, not just the single New Salary total. */}
            {!isAllowanceMode && selectedEmployee && nextSalary > 0 && (
              <div className="appraisal-split-breakdown">
                <span className="appraisal-split-title">Split — 50% Basic / 30% HRA / 20% Allowance</span>
                {(() => {
                  const basicShare = Math.round(nextSalary * 0.5 * 100) / 100;
                  const hraShare = Math.round(nextSalary * 0.3 * 100) / 100;
                  const allowanceShare = Math.round((nextSalary - basicShare - hraShare) * 100) / 100;
                  return (
                    <>
                      <div className="appraisal-split-row">
                        <span>Basic Salary (50%)</span>
                        <strong>{formatCurrency(basicShare)}</strong>
                      </div>
                      <div className="appraisal-split-row">
                        <span>HRA (30%)</span>
                        <strong>{formatCurrency(hraShare)}</strong>
                      </div>
                      <div className="appraisal-split-row">
                        <span>Allowance (20%)</span>
                        <strong>{formatCurrency(allowanceShare)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <button
              className="appraisal-confirm-button"
              onClick={applyIncrement}
              disabled={!canManageAppraisals || submitting || !selectedEmployeeId}
            >
              {submitting ? "Applying..." : "Confirm Adjustment"}
            </button>
          </div>
        </section>

        <section className="appraisal-panel appraisal-history-panel">
          <div className="appraisal-panel-header">
            <span>
              Adjustment History{selectedEmployee ? ` - ${selectedEmployee.name}` : ""}
            </span>
          </div>

          <div className="appraisal-panel-body" style={{ paddingBottom: 0 }}>
            <div className="appraisal-filter-grid">
              <label className="appraisal-field">
                <span>Company</span>
                <select value={companyFilter} onChange={(event) => {
                  setCompanyFilter(event.target.value);
                  setBranchFilter("");
                  setDepartmentFilter("");
                }}>
                  <option value="">All Companies</option>
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </label>

              <label className="appraisal-field">
                <span>Branch</span>
                <select value={branchFilter} onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setDepartmentFilter("");
                }}>
                  <option value="">All Branches</option>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </label>

              <label className="appraisal-field">
                <span>Department</span>
                <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                  <option value="">All Departments</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </label>

              <label className="appraisal-field">
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ALL">All Status</option>
                </select>
              </label>
            </div>
          </div>

          <div className="appraisal-history-table-wrapper">
            <table className="appraisal-history-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Adjustment Date</th>
                  <th>Type</th>
                  <th>Inc. Amount</th>
                  <th>Previous Salary</th>
                  <th>New Salary</th>
                  <th>Payroll</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length ? (
                  historyRows.map((appraisal) => {
                    const increment = Number(appraisal.approvedIncrement || appraisal.recommendedIncrement || 0);
                    const previousSalary = Number(appraisal.currentSalary || 0);
                    const newSalary = previousSalary + increment;

                    const isAllowanceRow = appraisal.type === "ALLOWANCE";
                    // includeInPayroll defaults to true for older records that predate
                    // the field, so we treat undefined as included.
                    const payrollIncluded = appraisal.includeInPayroll !== false;

                    return (
                      <tr key={appraisal._id}>
                        <td>
                          <div className="appraisal-history-date">{getEmployeeLabel(appraisal.employee)}</div>
                          <div className="appraisal-history-meta">
                            {[appraisal.employee?.company, appraisal.employee?.branch, appraisal.employee?.department].filter(Boolean).join(" • ") || "--"}
                          </div>
                        </td>
                        <td>
                          <div className="appraisal-history-date">{formatDate(appraisal.effectiveDate)}</div>
                          <div className="appraisal-history-meta">
                            {appraisal.comments || appraisal.cycle?.name || "Manual Appraisal"}
                          </div>
                        </td>
                        <td>
                          <span className={`appraisal-type-badge appraisal-type-badge--${isAllowanceRow ? "allowance" : "salary"}`}>
                            {isAllowanceRow ? "Allowance" : "Salary"}
                          </span>
                        </td>
                        <td className="appraisal-history-increment">+{formatCurrency(increment)}</td>
                        <td>{formatCurrency(previousSalary)}</td>
                        <td className="appraisal-history-new-salary">{formatCurrency(newSalary)}</td>
                        <td>
                          {isAllowanceRow ? (
                            <span className={`appraisal-payroll-badge appraisal-payroll-badge--${payrollIncluded ? "included" : "excluded"}`}>
                              {payrollIncluded ? "Included" : "Excluded"}
                            </span>
                          ) : (
                            <span className="appraisal-payroll-badge appraisal-payroll-badge--na">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="appraisal-empty-state">
                      {selectedEmployee
                        ? "No adjustment history found for this employee yet."
                        : "No adjustment history found for the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
