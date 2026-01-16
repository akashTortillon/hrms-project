import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../style/EmployeeDetail.css";

// Icons (using bootstrap-icons or valid imports, assuming generic svgs or library usage in project)
// Based on styles, basic SVGs are used. I'll use simple SVGs here to avoid dependency issues if not present.
const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const LocationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const MailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

import { getEmployeeById } from "../../services/employeeService";

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("Personal Info");
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const data = await getEmployeeById(id);
                const dob = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "N/A";
                const passportExpiry = data.passportExpiry ? new Date(data.passportExpiry).toISOString().split("T")[0] : "N/A";
                // Map backend fields to UI if needed, or just use data directly
                setEmployee({ ...data, dob, passportExpiry });
            } catch (err) {
                console.error(err);
                setError("Failed to load employee details");
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!employee) return <div className="p-8 text-center">Employee not found</div>;

    const tabs = ["Personal Info", "Employment", "Documents", "Attendance", "Assets"];

    return (
        <div className="employee-detail-container">
            {/* Header */}
            <div className="employee-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => navigate("/app/employees")} className="back-btn">
                        <BackArrowIcon />
                    </button>
                    <h1 className="employee-detail-title">
                        Employee Profile
                    </h1>
                </div>
                <p className="employee-detail-subtitle">View and manage employee information</p>
            </div>

            {/* Profile Card */}
            <div className="employee-profile-card">
                <div className="profile-main-info">
                    <div className="profile-avatar-large">
                        {employee.name ? employee.name.charAt(0) : "U"}
                    </div>
                    <div className="profile-details">
                        <h2>
                            {employee.name}
                            <span className={`status-badge`}>{employee.status}</span>
                        </h2>
                        <div className="profile-role-id">
                            {employee.role} • {employee.code}
                        </div>
                        <div className="profile-contact">
                            <div className="contact-item">
                                <MailIcon /> {employee.email}
                            </div>
                            <div className="contact-item">
                                <PhoneIcon /> {employee.phone}
                            </div>
                            <div className="contact-item">
                                {/* Location might not be in backend yet, using Department as placeholder or hardcode */}
                                <LocationIcon /> {employee.department}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <button className="edit-profile-btn">Edit Profile</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="employee-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {/* Icons can be added here if needed, keeping simple for now */}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="info-section">
                {activeTab === "Personal Info" && (
                    <div className="info-grid">
                        <div className="info-group">
                            <label>Date of Birth</label>
                            <div>{employee.dob}</div>
                        </div>
                        <div className="info-group">
                            <label>Nationality</label>
                            <div>{employee.nationality}</div>
                        </div>
                        <div className="info-group">
                            <label>UAE Address</label>
                            <div>{employee.address}</div>
                        </div>
                        <div className="info-group">
                            {/* Spacer or additional field */}
                        </div>
                        <div className="info-group">
                            <label>Passport Expiry</label>
                            <div>{employee.passportExpiry}</div>
                        </div>
                        <div className="info-group">
                            <label>Emirates ID Expiry</label>
                            <div>{employee.emiratesIdExpiry}</div>
                        </div>
                    </div>
                )}

                {activeTab !== "Personal Info" && (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                        Content for {activeTab} will be available soon.
                    </div>
                )}
            </div>
        </div>
    );
}
