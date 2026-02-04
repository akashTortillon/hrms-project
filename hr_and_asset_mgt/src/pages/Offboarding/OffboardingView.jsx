import { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService";
import WorkflowTab from "../../components/employee/WorkflowTab";
import SvgIcon from "../../components/svgIcon/svgView";

export default function OffboardingView() {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            setFilteredEmployees(employees.filter(e =>
                e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.code.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        } else {
            setFilteredEmployees(employees);
        }
    }, [searchTerm, employees]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await getEmployees();
            if (Array.isArray(res)) {
                // Offboarding can apply to anyone, usually 'Active' or 'Inactive' being processed.
                // We'll show everyone to allow starting the process.
                // Ideally filter out 'Onboarding' if separate.
                const list = res.filter(e => e.status !== "Onboarding");
                setEmployees(list);
                setFilteredEmployees(list);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="offboarding-page">

            {/* LEFT: Employee List */}
            <div className="offboarding-list-card">
                <div className="list-header">
                    <h3>Offboarding Management</h3>
                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="list-search-input"
                    />
                </div>

                <div className="list-content">
                    {loading ? (
                        <div className="list-empty">Loading...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="list-empty">No employees found.</div>
                    ) : (
                        filteredEmployees.map(emp => (
                            <div
                                key={emp._id}
                                onClick={() => setSelectedEmployee(emp)}
                                className={`list-item ${selectedEmployee?._id === emp._id ? 'active' : ''}`}
                            >
                                <div className="list-item-header">
                                    <div className="list-item-name">{emp.name}</div>
                                    <span className="list-item-badge">{emp.status}</span>
                                </div>
                                <div className="list-item-meta">{emp.designation || emp.role}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Workflow Details */}
            <div className="offboarding-detail-card">
                {selectedEmployee ? (
                    <>
                        <div className="detail-header">
                            <div className="detail-avatar offboarding">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div>
                                <h2>{selectedEmployee.name}</h2>
                                <p>{selectedEmployee.code} • {selectedEmployee.department}</p>
                            </div>
                        </div>

                        <div className="detail-content">
                            <WorkflowTab employeeId={selectedEmployee._id} type="Offboarding" />
                        </div>
                    </>
                ) : (
                    <div className="detail-empty">
                        <SvgIcon name="briefcase" size={40} color="#e5e7eb" />
                        <p>Select an employee to manage offboarding</p>
                    </div>
                )}
            </div>

        </div>
    );
}
