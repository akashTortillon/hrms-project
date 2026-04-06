import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";
import { getEmployees } from "../../services/employeeService";
import { appraisalService } from "../../services/appraisalService";
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

const getBaseSalary = (employee) =>
  Number(employee?.visaBase || employee?.basicSalary || 0);

const getEmployeeLabel = (employee) => {
  if (!employee) return "";
  return employee.code
    ? `${employee.name} (${employee.code})`
    : employee.name;
};

const createCycleName = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `Increment Adjustment ${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

export default function AppraisalsView() {
  const { hasPermission } = useRole();
  const canManageAppraisals = hasPermission("MANAGE_APPRAISALS");

  const [employees, setEmployees] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [incrementAmount, setIncrementAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (preferredEmployeeId = "") => {
    try {
      setLoading(true);
      const [employeeData, appraisalData] = await Promise.all([
        getEmployees(),
        appraisalService.getAll()
      ]);

      setEmployees(employeeData);
      setAppraisals(appraisalData);

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
    } catch (error) {
      toast.error("Failed to load increment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEmployee = employees.find((employee) => employee._id === selectedEmployeeId) || null;
  const currentBaseSalary = getBaseSalary(selectedEmployee);
  const parsedIncrement = Number(String(incrementAmount || 0).replace(/[^0-9.-]+/g, ""));
  const nextSalary = currentBaseSalary + (Number.isFinite(parsedIncrement) ? parsedIncrement : 0);

  const historyRows = appraisals
    .filter((appraisal) => appraisal.employee?._id === selectedEmployeeId && appraisal.status === "APPROVED")
    .sort((left, right) => new Date(right.effectiveDate) - new Date(left.effectiveDate));

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees.find((item) => item._id === employeeId);
    setEmployeeSearch(getEmployeeLabel(employee));
  };

  const applyIncrement = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!Number.isFinite(parsedIncrement) || parsedIncrement <= 0) {
      toast.error("Please enter a valid increment amount");
      return;
    }

    try {
      setSubmitting(true);

      const today = new Date().toISOString().slice(0, 10);
      const cycle = await appraisalService.createCycle({
        name: createCycleName(),
        startDate: today,
        endDate: today,
        status: "ACTIVE"
      });

      const appraisal = await appraisalService.create({
        employee: selectedEmployeeId,
        cycle: cycle._id,
        recommendedIncrement: parsedIncrement,
        effectiveDate: today,
        comments: "Manual appraisal adjustment"
      });

      await appraisalService.approve(appraisal._id, {
        approvedIncrement: parsedIncrement,
        effectiveDate: today,
        notes: "Applied from Salary Increment & Appraisal screen"
      });

      setIncrementAmount("");
      await loadData(selectedEmployeeId);
      toast.success("Increment applied successfully");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to apply increment";
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
            <span>Apply Increment</span>
          </div>

          <div className="appraisal-panel-body">
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
              </div>
              <datalist id="appraisal-employee-options">
                {employees.map((employee) => (
                  <option key={employee._id} value={getEmployeeLabel(employee)}>
                    {[employee.code, employee.designation].filter(Boolean).join(" • ")}
                  </option>
                ))}
              </datalist>
            </label>

            <div className="appraisal-salary-box">
              <span className="appraisal-salary-label">Current Base Salary</span>
              <strong>{selectedEmployee ? formatCurrency(currentBaseSalary) : "--"}</strong>
            </div>

            <label className="appraisal-field">
              <span>Increment Amount</span>
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

            <div className="appraisal-next-salary">
              <span>New Salary</span>
              <strong>{selectedEmployee ? formatCurrency(nextSalary) : "--"}</strong>
            </div>

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

          <div className="appraisal-history-table-wrapper">
            <table className="appraisal-history-table">
              <thead>
                <tr>
                  <th>Adjustment Date</th>
                  <th>Inc. Amount</th>
                  <th>Previous Salary</th>
                  <th>New Salary</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length ? (
                  historyRows.map((appraisal) => {
                    const increment = Number(appraisal.approvedIncrement || appraisal.recommendedIncrement || 0);
                    const previousSalary = Number(appraisal.currentSalary || 0);
                    const newSalary = previousSalary + increment;

                    return (
                      <tr key={appraisal._id}>
                        <td>
                          <div className="appraisal-history-date">{formatDate(appraisal.effectiveDate)}</div>
                          <div className="appraisal-history-meta">
                            {appraisal.comments || appraisal.cycle?.name || "Manual Appraisal"}
                          </div>
                        </td>
                        <td className="appraisal-history-increment">+{formatCurrency(increment)}</td>
                        <td>{formatCurrency(previousSalary)}</td>
                        <td className="appraisal-history-new-salary">{formatCurrency(newSalary)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="appraisal-empty-state">
                      {selectedEmployee
                        ? "No adjustment history found for this employee yet."
                        : "Select an employee to view adjustment history."}
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
