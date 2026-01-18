
import React from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import "../../style/Payroll.css"; // Ensure this has modal styles

export default function PayslipModal({ show, onClose, record }) {
    if (!record) return null;

    const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary } = record;
    const monthName = record.month ? new Date(2000, record.month - 1).toLocaleString('default', { month: 'long' }) : '';
    const periodStr = `${monthName} ${record.year}`;

    // Styles from user request (converted to const for cleaner JSX)
    const styles = {
        container: {
            backgroundColor: '#f5f5f5',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '8px'
        },
        payslip: {
            width: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 20px rgba(0,0,0,0.05)',
            padding: '40px'
        },
        header: {
            textAlign: 'center',
            borderBottom: '3px solid #333',
            paddingBottom: '15px',
            marginBottom: '25px'
        },
        title: {
            margin: '0',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333'
        },
        period: {
            margin: '5px 0 0 0',
            fontSize: '14px',
            color: '#666'
        },
        section: {
            marginBottom: '25px'
        },
        infoGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #e0e0e0'
        },
        infoItem: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '5px 0'
        },
        label: {
            fontWeight: '600',
            color: '#555'
        },
        value: {
            color: '#333',
            textAlign: 'right'
        },
        sectionTitle: {
            margin: '0 0 15px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '8px'
        },
        attendanceGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '15px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #e0e0e0'
        },
        attendanceItem: {
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0'
        },
        attendanceLabel: {
            display: 'block',
            fontSize: '12px',
            color: '#666',
            marginBottom: '5px'
        },
        attendanceValue: {
            display: 'block',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333'
        },
        earningsDeductionsContainer: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '25px'
        },
        column: {
            border: '1px solid #e0e0e0',
            padding: '15px'
        },
        lineItem: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '14px'
        },
        totalLine: {
            borderTop: '2px solid #333',
            borderBottom: 'none',
            marginTop: '10px',
            paddingTop: '15px'
        },
        boldText: {
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#333'
        },
        netSalarySection: {
            marginTop: '30px',
            marginBottom: '30px'
        },
        netSalaryBox: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#2c5f2d',
            color: '#fff',
            border: '3px solid #1e4620'
        },
        netSalaryLabel: {
            fontSize: '18px',
            fontWeight: 'bold'
        },
        netSalaryAmount: {
            fontSize: '28px',
            fontWeight: 'bold'
        },
        footer: {
            borderTop: '1px solid #e0e0e0',
            paddingTop: '15px',
            textAlign: 'center'
        },
        footerText: {
            margin: '0',
            fontSize: '12px',
            color: '#999',
            fontStyle: 'italic'
        }
    };

    return (
        <CustomModal
            show={show}
            title="Payslip Details"
            onClose={onClose}
            width="900px"
        >
            <div style={styles.container}>
                <div style={styles.payslip}>
                    {/* Header */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>SALARY SLIP</h1>
                        <p style={styles.period}>{periodStr}</p>
                    </div>

                    {/* Employee Info */}
                    <div style={styles.section}>
                        <div style={styles.infoGrid}>
                            <div style={styles.infoItem}>
                                <span style={styles.label}>Employee Name:</span>
                                <span style={styles.value}>{employee?.name || "Unknown"}</span>
                            </div>
                            <div style={styles.infoItem}>
                                <span style={styles.label}>Employee ID:</span>
                                <span style={styles.value}>{employee?.code || 'N/A'}</span>
                            </div>
                            <div style={styles.infoItem}>
                                <span style={styles.label}>Designation:</span>
                                <span style={styles.value}>{employee?.designation ? `${employee.designation} • ${employee.department}` : 'N/A'}</span>
                            </div>
                            <div style={styles.infoItem}>
                                <span style={styles.label}>Payroll ID:</span>
                                <span style={styles.value}>{record._id.substring(0, 8)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>ATTENDANCE SUMMARY</h3>
                        <div style={styles.attendanceGrid}>
                            <div style={styles.attendanceItem}>
                                <span style={styles.attendanceLabel}>Total Days</span>
                                <span style={styles.attendanceValue}>{attendanceSummary?.totalDays || 30}</span>
                            </div>
                            <div style={styles.attendanceItem}>
                                <span style={styles.attendanceLabel}>Present Days</span>
                                <span style={styles.attendanceValue}>{attendanceSummary?.daysPresent || 0}</span>
                            </div>
                            <div style={styles.attendanceItem}>
                                <span style={styles.attendanceLabel}>Absent Days</span>
                                <span style={styles.attendanceValue}>{attendanceSummary?.daysAbsent || 0}</span>
                            </div>
                            <div style={styles.attendanceItem}>
                                <span style={styles.attendanceLabel}>Late Count</span>
                                <span style={styles.attendanceValue}>{attendanceSummary?.late || 0}</span>
                            </div>
                            <div style={styles.attendanceItem}>
                                <span style={styles.attendanceLabel}>Overtime (Hrs)</span>
                                <span style={styles.attendanceValue}>{attendanceSummary?.overtimeHours || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Earnings and Deductions */}
                    <div style={styles.earningsDeductionsContainer}>
                        {/* Earnings */}
                        <div style={styles.column}>
                            <h3 style={styles.sectionTitle}>EARNINGS</h3>
                            <div style={styles.lineItem}>
                                <span>Basic Salary</span>
                                <span>{basicSalary?.toLocaleString()} AED</span>
                            </div>
                            {allowances?.map((allow, idx) => (
                                <div key={idx} style={styles.lineItem}>
                                    <span>{allow.name}</span>
                                    <span>{allow.amount?.toLocaleString()} AED</span>
                                </div>
                            ))}
                            <div style={{ ...styles.lineItem, ...styles.totalLine }}>
                                <span style={styles.boldText}>Total Earnings</span>
                                <span style={styles.boldText}>{(basicSalary + (record.totalAllowances || 0)).toLocaleString()} AED</span>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div style={styles.column}>
                            <h3 style={styles.sectionTitle}>DEDUCTIONS</h3>
                            {deductions?.length === 0 ? (
                                <div style={{ ...styles.lineItem, fontStyle: 'italic', color: '#999' }}>No Deductions</div>
                            ) : null}
                            {deductions?.map((deduct, idx) => (
                                <div key={idx} style={styles.lineItem}>
                                    <span>{deduct.name}</span>
                                    <span>-{deduct.amount?.toLocaleString()} AED</span>
                                </div>
                            ))}
                            <div style={{ ...styles.lineItem, ...styles.totalLine }}>
                                <span style={styles.boldText}>Total Deductions</span>
                                <span style={styles.boldText}>-{(record.totalDeductions || 0).toLocaleString()} AED</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary */}
                    <div style={styles.netSalarySection}>
                        <div style={styles.netSalaryBox}>
                            <span style={styles.netSalaryLabel}>NET SALARY PAYABLE</span>
                            <span style={styles.netSalaryAmount}>{netSalary?.toLocaleString()} AED</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={styles.footer}>
                        <p style={styles.footerText}>This is a computer-generated payslip and does not require a signature.</p>
                    </div>
                </div>
            </div>
        </CustomModal>
    );
}
