import { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService";
import WorkflowTab from "../../components/employee/WorkflowTab";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Employees.css"; // Reusing employee styles for list

export default function OnboardingView() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOnboardingEmployees();
    }, []);

    const fetchOnboardingEmployees = async () => {
        try {
            setLoading(true);
            // Fetch ALL employees and filter client-side for "Onboarding" status
            // Ideally the API should support status filtering directly if optimized
            const res = await getEmployees();
            if (Array.isArray(res)) {
                const onboardingList = res.filter(e => e.status === "Onboarding");
                setEmployees(onboardingList);
                if (onboardingList.length > 0) {
                    setSelectedEmployee(onboardingList[0]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch onboarding employees", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-page">

            {/* LEFT: Employee List */}
            <div className="onboarding-list-card">
                <div className="list-header">
                    <h3>Onboarding Queue</h3>
                    <p>{employees.length} pending completion</p>
                </div>

                <div className="list-content">
                    {loading ? (
                        <div className="list-empty">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="list-empty">No employees in onboarding.</div>
                    ) : (
                        employees.map(emp => (
                            <div
                                key={emp._id}
                                onClick={() => setSelectedEmployee(emp)}
                                className={`list-item ${selectedEmployee?._id === emp._id ? 'active' : ''}`}
                            >
                                <div className="list-item-name">{emp.name}</div>
                                <div className="list-item-meta">{emp.designation || emp.role}</div>
                                <div className="list-item-date">Joined: {new Date(emp.joinDate).toLocaleDateString()}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Workflow Details */}
            <div className="onboarding-detail-card">
                {selectedEmployee ? (
                    <>
                        <div className="detail-header">
                            <div className="detail-avatar">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div>
                                <h2>{selectedEmployee.name}</h2>
                                <p>{selectedEmployee.code} • {selectedEmployee.department}</p>
                            </div>
                        </div>

                        <div className="detail-content">
                            <WorkflowTab employeeId={selectedEmployee._id} type="Onboarding" />
                        </div>
                    </>
                ) : (
                    <div className="detail-empty">
                        <SvgIcon name="user" size={40} color="#e5e7eb" />
                        <p>Select an employee to view onboarding progress</p>
                    </div>
                )}
            </div>

        </div>
    );
}
