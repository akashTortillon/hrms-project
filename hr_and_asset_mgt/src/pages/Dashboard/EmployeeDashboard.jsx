import React, { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext.jsx";
import { getEmployeeDocuments } from "../../services/employeeService.js";
import { getEmployeeRequests } from "../../services/requestService.js";
import { getEmployeeAttendanceStats } from "../../services/attendanceService.js";
import ChangePasswordModal from "../Authentication/ChangePasswordModal.jsx";

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const { role } = useRole();
    const [user, setUser] = useState(null);

    // Stats State
    const [docStats, setDocStats] = useState({ valid: 0, expiring: 0, expired: 0, total: 0 });
    const [reqStats, setReqStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [recentRequests, setRecentRequests] = useState([]); // Store recent requests
    const [attStats, setAttStats] = useState({ present: 0, late: 0, absent: 0, total: 0 });

    // Modals
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    useEffect(() => {
        // Load user info from local storage
        try {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            if (storedUser) {
                setUser(storedUser);
                if (storedUser.employeeId) {
                    fetchDashboardStats(storedUser.employeeId);
                }
            }
        } catch (e) {
            console.error("Failed to load user info", e);
        }
    }, []);

    const fetchDashboardStats = async (employeeId) => {
        try {
            // 1. Documents
            const docs = await getEmployeeDocuments(employeeId);
            const now = new Date();
            const expLimit = new Date();
            expLimit.setDate(now.getDate() + 30); // 30 days specific warning

            let dStats = { valid: 0, expiring: 0, expired: 0, total: docs.length };
            docs.forEach(d => {
                if (d.status === 'Expired') dStats.expired++;
                else if (d.status === 'Expiring Soon') dStats.expiring++;
                else dStats.valid++;
            });
            setDocStats(dStats);

            // 2. Requests
            const reqs = await getEmployeeRequests(employeeId);
            const requestsList = Array.isArray(reqs) ? reqs : (reqs.data || []);

            // Sort by date desc (assuming createdAt or updatedAt exists, else rely on default order)
            // If API returns newest first, just take slice. Let's start with slice.
            setRecentRequests(requestsList.slice(0, 3));

            let rStats = { pending: 0, approved: 0, rejected: 0, total: requestsList.length };
            requestsList.forEach(r => {
                if (r.status === 'PENDING') rStats.pending++;
                else if (r.status === 'APPROVED') rStats.approved++;
                else if (r.status === 'REJECTED') rStats.rejected++;
            });
            setReqStats(rStats);

            // 3. Attendance
            const att = await getEmployeeAttendanceStats(employeeId);
            setAttStats(att);

        } catch (e) {
            console.error("Error fetching dashboard stats", e);
        }
    };

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const WidgetCard = ({ title, icon, color, children, onClick }) => (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                height: '100%',
                border: '1px solid #e5e7eb',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column'
            }}
            className={onClick ? "hover:shadow-lg hover:-translate-y-1" : ""}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>{title}</h4>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: `${color}15`, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <SvgIcon name={icon} size={20} />
                </div>
            </div>
            <div style={{ flex: 1 }}>
                {children}
            </div>
        </div>
    );

    const StatRow = ({ label, value, color }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: '#6b7280' }}>{label}</span>
            <span style={{ fontWeight: '600', color: color || '#111827' }}>{value}</span>
        </div>
    );

    const RequestPreviewItem = ({ req }) => {
        const statusColors = {
            PENDING: { bg: '#fff7ed', text: '#c2410c' },
            APPROVED: { bg: '#f0fdf4', text: '#15803d' },
            REJECTED: { bg: '#fef2f2', text: '#b91c1c' },
            WITHDRAWN: { bg: '#f9fafb', text: '#4b5563' }
        };
        const style = statusColors[req.status] || { bg: '#f3f4f6', text: '#374151' };

        return (
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #f3f4f6'
            }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                        {req.requestType.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <span style={{
                    fontSize: '11px', fontWeight: '600',
                    background: style.bg, color: style.text,
                    padding: '2px 8px', borderRadius: '12px'
                }}>
                    {req.status}
                </span>
            </div>
        );
    };

    return (
        <Container fluid className="dashboard-page">
            {/* Welcome Section */}
            <div className="mb-4">
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                    {getTimeGreeting()}, {user?.name || "Employee"}!
                </h2>
                <p style={{ color: '#6b7280' }}>Here is an overview of your activity.</p>
            </div>

            {/* Profile Summary Card */}
            <Row className="mb-4">
                <Col md={12}>
                    <div style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                        borderRadius: '16px',
                        padding: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        color: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'white', color: '#4f46e5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', fontWeight: 'bold'
                        }}>
                            {user?.name?.charAt(0) || "U"}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{user?.name}</h3>
                            <div style={{ display: 'flex', gap: '20px', fontSize: '15px', flexWrap: 'wrap', opacity: 0.9 }}>
                                <span style={{ display: 'flex', items: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.7 }}>ID:</span> {user?.code || 'N/A'}
                                </span>
                                <span style={{ display: 'flex', items: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.7 }}>Role:</span> {role}
                                </span>
                                <span style={{ display: 'flex', items: 'center', gap: '6px' }}>
                                    <span style={{ opacity: 0.7 }}>Email:</span> {user?.email}
                                </span>
                            </div>
                        </div>
                        <div>
                            <button
                                onClick={() => setShowChangePasswordModal(true)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                className="hover:bg-white/30"
                            >
                                <SvgIcon name="lock" size={16} /> Change Password
                            </button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Widgets Grid */}
            <Row>
                {/* My Requests Widget - PREVIEW MODE */}
                <Col md={4} className="mb-4">
                    <WidgetCard
                        title="My Requests"
                        icon="clock (1)"
                        color="#f59e0b" // Amber
                        onClick={() => navigate('/app/requests')}
                    >
                        {recentRequests.length > 0 ? (
                            <div style={{ marginBottom: '10px' }}>
                                {recentRequests.map(req => (
                                    <RequestPreviewItem key={req._id} req={req} />
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: '14px' }}>
                                No recent requests
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{reqStats.pending} Pending</span>
                                <span>{reqStats.total} Total</span>
                            </div>
                        </div>
                    </WidgetCard>
                </Col>

                {/* My Documents Widget */}
                <Col md={4} className="mb-4">
                    <WidgetCard
                        title="My Documents"
                        icon="document"
                        color="#8b5cf6" // Violet
                        onClick={() => navigate('/app/employees/me?tab=Documents')}
                    >
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: "flex", alignItems: "baseline" }}>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: docStats.expiring > 0 ? '#ea580c' : '#111827' }}>
                                    {docStats.expiring}
                                </div>
                                <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px' }}>Expiring Soon</span>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '15px', marginTop: 'auto' }}>
                            <StatRow label="Valid" value={docStats.valid} color="#16a34a" />
                            <StatRow label="Expired" value={docStats.expired} color="#dc2626" />
                            <StatRow label="Total Documents" value={docStats.total} />
                        </div>
                    </WidgetCard>
                </Col>

                {/* My Attendance Widget */}
                <Col md={4} className="mb-4">
                    <WidgetCard
                        title="My Attendance"
                        icon="calendar"
                        color="#3b82f6" // Blue
                        onClick={() => navigate('/app/attendance')}
                    >
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: "flex", gap: "15px" }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{attStats.present}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Present</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{attStats.absent}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Absent</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ca8a04' }}>{attStats.late}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Late</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '15px', marginTop: 'auto' }}>
                            <StatRow label="Total Work Days" value={attStats.total} />
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                *Stats for current month
                            </div>
                        </div>
                    </WidgetCard>
                </Col>
            </Row>

            <ChangePasswordModal
                show={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
        </Container>
    );
}
