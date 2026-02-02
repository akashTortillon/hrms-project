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
        <div className="onboarding-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', gap: '20px' }}>

            {/* LEFT: Employee List */}
            <div className="onboarding-list-card" style={{
                width: '350px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div className="list-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Onboarding Queue</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>{employees.length} pending completion</p>
                </div>

                <div className="list-content" style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
                    ) : employees.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No employees in onboarding.</div>
                    ) : (
                        employees.map(emp => (
                            <div
                                key={emp._id}
                                onClick={() => setSelectedEmployee(emp)}
                                style={{
                                    padding: '12px 20px',
                                    borderBottom: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    background: selectedEmployee?._id === emp._id ? '#eff6ff' : 'white',
                                    borderLeft: selectedEmployee?._id === emp._id ? '3px solid #3b82f6' : '3px solid transparent'
                                }}
                            >
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{emp.name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.designation || emp.role}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Joined: {new Date(emp.joinDate).toLocaleDateString()}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Workflow Details */}
            <div className="onboarding-detail-card" style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {selectedEmployee ? (
                    <>
                        <div className="detail-header" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: '600' }}>
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedEmployee.name}</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{selectedEmployee.code} • {selectedEmployee.department}</p>
                            </div>
                        </div>

                        <div className="detail-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            <WorkflowTab employeeId={selectedEmployee._id} type="Onboarding" />
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px' }}>
                        <SvgIcon name="user" size={40} color="#e5e7eb" />
                        <p>Select an employee to view onboarding progress</p>
                    </div>
                )}
            </div>

        </div>
    );
}
