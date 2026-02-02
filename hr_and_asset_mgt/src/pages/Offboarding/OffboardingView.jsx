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
        <div className="offboarding-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', gap: '20px' }}>

            {/* LEFT: Employee List */}
            <div className="offboarding-list-card" style={{
                width: '350px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div className="list-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Offboarding Management</h3>
                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px'
                        }}
                    />
                </div>

                <div className="list-content" style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No employees found.</div>
                    ) : (
                        filteredEmployees.map(emp => (
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
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{emp.name}</div>
                                    <span style={{ fontSize: '10px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#6b7280' }}>{emp.status}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.designation || emp.role}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Workflow Details */}
            <div className="offboarding-detail-card" style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {selectedEmployee ? (
                    <>
                        <div className="detail-header" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b', fontWeight: '600' }}>
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedEmployee.name}</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{selectedEmployee.code} • {selectedEmployee.department}</p>
                            </div>
                        </div>

                        <div className="detail-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            <WorkflowTab employeeId={selectedEmployee._id} type="Offboarding" />
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '10px' }}>
                        <SvgIcon name="briefcase" size={40} color="#e5e7eb" />
                        <p>Select an employee to manage offboarding</p>
                    </div>
                )}
            </div>

        </div>
    );
}
