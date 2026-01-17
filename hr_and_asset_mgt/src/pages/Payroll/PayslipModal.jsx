
import React from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import "../../style/Payroll.css"; // Ensure this has modal styles

export default function PayslipModal({ show, onClose, record }) {
    if (!record) return null;

    const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary } = record;

    return (
        <CustomModal
            show={show}
            title="Payslip Details"
            onClose={onClose}
            width="600px" // Wider modal for payslip
        >
            <div className="payslip-container">
                {/* Employee Header */}
                <div className="payslip-header">
                    <div>
                        <h4 className="text-lg font-bold">
                            {employee?.firstName ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee"}
                        </h4>
                        <p className="text-gray-500 text-sm">
                            {[employee?.designation, employee?.department].filter(Boolean).join(" • ") || "No Department Info"}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-400">Payroll ID</span>
                        <p className="font-mono text-sm">{record._id.substring(0, 8)}</p>
                    </div>
                </div>

                {/* Attendance Summary */}
                <div className="attendance-summary-box mb-6 p-3 bg-gray-50 rounded-lg flex justify-between text-sm">
                    <div>
                        <span className="block text-gray-500 text-xs">Present</span>
                        <span className="font-semibold text-green-600">{attendanceSummary?.daysPresent || 0} Days</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 text-xs">Absent / Unpaid</span>
                        <span className="font-semibold text-red-600">{attendanceSummary?.daysAbsent || 0} Days</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 text-xs">Overtime</span>
                        <span className="font-semibold text-blue-600">{attendanceSummary?.overtimeHours || 0} Hrs</span>
                    </div>
                    <div>
                        <span className="block text-gray-500 text-xs">Total Days</span>
                        <span className="font-semibold text-gray-700">{attendanceSummary?.totalDays || 30}</span>
                    </div>
                </div>

                {/* Earnings Section */}
                <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-2">Earnings</h5>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Basic Salary</span>
                            <span>{basicSalary?.toLocaleString()} AED</span>
                        </div>
                        {allowances?.map((allow, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span>{allow.name}
                                    {allow.type === 'AUTO' && <span className="text-xs text-gray-400 ml-1">(Auto)</span>}
                                </span>
                                <span className="text-green-600">+{allow.amount?.toLocaleString()} AED</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed">
                        <span>Total Earnings</span>
                        <span className="text-green-700">
                            {(basicSalary + (record.totalAllowances || 0)).toLocaleString()} AED
                        </span>
                    </div>
                </div>

                {/* Deductions Section */}
                <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-2">Deductions</h5>
                    <div className="space-y-2">
                        {deductions?.length === 0 && <p className="text-xs text-gray-400 italic">No deductions</p>}
                        {deductions?.map((deduct, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span>{deduct.name}</span>
                                <span className="text-red-600">-{deduct.amount?.toLocaleString()} AED</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed">
                        <span>Total Deductions</span>
                        <span className="text-red-700">
                            -{(record.totalDeductions || 0).toLocaleString()} AED
                        </span>
                    </div>
                </div>

                {/* Net Salary Highlight */}
                <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                    <span className="text-blue-900 font-bold">Net Salary To Pay</span>
                    <span className="text-2xl font-bold text-blue-900">{netSalary?.toLocaleString()} AED</span>
                </div>

            </div>
        </CustomModal>
    );
}
