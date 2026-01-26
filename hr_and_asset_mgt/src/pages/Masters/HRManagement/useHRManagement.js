import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    employeeTypeService,
    leaveTypeService,
    documentTypeService,
    companyDocumentTypeService,
    nationalityService,
    payrollRuleService,
    workflowTemplateService,
    shiftService
} from "../../../services/masterService";

export default function useHRManagement() {
    const [employeeTypes, setEmployeeTypes] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]); // Employee Document Types
    const [companyDocumentTypes, setCompanyDocumentTypes] = useState([]); // Company Document Types
    const [nationalities, setNationalities] = useState([]);
    const [payrollRules, setPayrollRules] = useState([]);
    const [workflowTemplates, setWorkflowTemplates] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);

    const [deleteConfig, setDeleteConfig] = useState({ show: false, type: null, id: null, name: null });

    // State for the advanced Leave/Payroll Modal
    const [payrollState, setPayrollState] = useState({
        step: 'SELECTION', // SELECTION, LEAVE_FORM, PAYROLL_FORM
        subType: '',       // LEAVE or PAYROLL
        leaveTypeId: '',
        ruleName: '',
        days: '',
        description: ''
    });

    const [workflowState, setWorkflowState] = useState({
        steps: [] // Array of { name: '', description: '', required: true }
    });
    const [tempStepName, setTempStepName] = useState("");

    const [shifts, setShifts] = useState([]);
    const [shiftState, setShiftState] = useState({
        startTime: '09:00',
        endTime: '18:00',
        lateLimit: '09:15',
        workHours: '9'
    });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try { setEmployeeTypes(await employeeTypeService.getAll()); } catch (e) { console.error(e); }
        try { setLeaveTypes(await leaveTypeService.getAll()); } catch (e) { console.error(e); }
        try { setDocumentTypes(await documentTypeService.getAll()); } catch (e) { console.error(e); }
        try { setCompanyDocumentTypes(await companyDocumentTypeService.getAll()); } catch (e) { console.error(e); }
        try { setNationalities(await nationalityService.getAll()); } catch (e) { console.error(e); }
        try { setPayrollRules(await payrollRuleService.getAll()); } catch (e) { console.error(e); }
        try { setWorkflowTemplates(await workflowTemplateService.getAll()); } catch (e) { console.error(e); }
        try { setShifts(await shiftService.getAll()); } catch (e) { console.error(e); }
    };

    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setEditId(null);
        // Reset payroll state
        setPayrollState({
            step: 'SELECTION',
            subType: '',
            leaveTypeId: '',
            ruleName: '',
            days: '',
            accrualRate: '',
            accrualFrequency: 'MONTHLY',
            carryForwardLimit: '',
            isPaid: true,
            description: '',
            category: 'ALLOWANCE',
            calculationType: 'FIXED',
            value: '',
            category: 'ALLOWANCE',
            calculationType: 'FIXED',
            value: '',
            basis: '',
            base: 'BASIC_SALARY',
            isAutomatic: true
        });
        setShiftState({
            startTime: '09:00',
            endTime: '18:00',
            lateLimit: '09:15',
            workHours: '9'
        });
        setWorkflowState({ steps: [] });
        setTempStepName("");
        setShowModal(true);
    };

    const handleOpenEdit = (type, item) => {
        setModalType(type);
        setEditId(item._id);

        if (type === "Payroll Rule") {
            // Rehydrate form based on stored metadata
            const meta = item.metadata || {};
            const isLeave = meta.type === 'LEAVE_CONFIG';

            setPayrollState({
                step: isLeave ? 'LEAVE_FORM' : 'PAYROLL_FORM',
                subType: isLeave ? 'LEAVE' : 'PAYROLL',
                leaveTypeId: meta.leaveTypeId || '',
                ruleName: isLeave ? '' : item.name,
                days: meta.days || '',
                accrualRate: meta.accrualRate || '',
                accrualFrequency: meta.accrualFrequency || 'MONTHLY',
                carryForwardLimit: meta.carryForwardLimit || '',
                isPaid: meta.isPaid ?? true,
                description: item.description || '',
                category: meta.category || 'ALLOWANCE',
                calculationType: meta.calculationType || 'FIXED',
                value: meta.value || '',
                calculationType: meta.calculationType || 'FIXED',
                value: meta.value || '',
                basis: meta.basis || '',
                base: meta.base || 'BASIC_SALARY',
                isAutomatic: meta.isAutomatic ?? true
            });
            // We don't rely on inputValue for Payroll Rules edit, but setting it safely
            setInputValue(item.name);
        } else if (type === "Shift") {
            const meta = item.metadata || {};
            setShiftState({
                startTime: meta.startTime || '09:00',
                endTime: meta.endTime || '18:00',
                lateLimit: meta.lateLimit || '09:15',
                workHours: meta.workHours || '9'
            });
            setInputValue(item.name);
        } else if (type === "Workflow Template") {
            const meta = item.metadata || {};
            setWorkflowState({
                steps: meta.steps || []
            });
            setInputValue(item.name);
        } else {
            setInputValue(item.name);
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        // Validation: For standard masters check inputValue, for Payroll Rule skip this check
        if (modalType !== "Payroll Rule" && !inputValue.trim()) return toast.warning("Please enter a name");

        setLoading(true);

        try {
            if (modalType === "Employee Type") {
                if (editId) await employeeTypeService.update(editId, inputValue);
                else await employeeTypeService.add(inputValue);
                setEmployeeTypes(await employeeTypeService.getAll());
            } else if (modalType === "Leave Type") {
                if (editId) await leaveTypeService.update(editId, inputValue);
                else await leaveTypeService.add(inputValue);
                setLeaveTypes(await leaveTypeService.getAll());
            } else if (modalType === "Employee Document Type") {
                if (editId) await documentTypeService.update(editId, inputValue);
                else await documentTypeService.add(inputValue);
                setDocumentTypes(await documentTypeService.getAll());
            } else if (modalType === "Company Document Type") {
                if (editId) await companyDocumentTypeService.update(editId, inputValue);
                else await companyDocumentTypeService.add(inputValue);
                setCompanyDocumentTypes(await companyDocumentTypeService.getAll());
            } else if (modalType === "Nationality") {
                if (editId) await nationalityService.update(editId, inputValue);
                else await nationalityService.add(inputValue);
                setNationalities(await nationalityService.getAll());
            } else if (modalType === "Payroll Rule") {
                let payload;
                // Determine if we are saving a complex Payroll/Leave Object or a simple edit
                // If it's the new flow (payrollState is active)
                if (payrollState.subType) {
                    if (payrollState.subType === 'LEAVE') {
                        // Find the leave type name for the main 'name' field
                        const selectedLeave = leaveTypes.find(l => l._id === payrollState.leaveTypeId);
                        const name = selectedLeave ? `${selectedLeave.name} Policy` : "Leave Policy";

                        payload = {
                            name: name,
                            description: payrollState.description,
                            relatedId: payrollState.leaveTypeId, // Strong DB Link
                            metadata: {
                                type: 'LEAVE_CONFIG',
                                leaveTypeId: payrollState.leaveTypeId,
                                days: payrollState.days,
                                accrualRate: Number(payrollState.accrualRate),
                                accrualFrequency: payrollState.accrualFrequency,
                                carryForwardLimit: Number(payrollState.carryForwardLimit),
                                isPaid: payrollState.isPaid
                            }
                        };
                    } else {
                        // PAYROLL
                        payload = {
                            name: payrollState.ruleName,
                            description: payrollState.description,
                            metadata: {
                                type: 'PAYROLL_CONFIG',
                                category: payrollState.category,
                                calculationType: payrollState.calculationType,
                                value: Number(payrollState.value),
                                base: payrollState.base,
                                value: Number(payrollState.value),
                                basis: payrollState.basis,
                                base: payrollState.base,
                                isAutomatic: payrollState.isAutomatic
                            }
                        };
                    }
                } else {
                    // Fallback for simple edits or legacy data if accessed differently
                    payload = { name: inputValue };
                }

                if (editId) await payrollRuleService.update(editId, payload);
                else await payrollRuleService.add(payload);
                setPayrollRules(await payrollRuleService.getAll());
            } else if (modalType === "Workflow Template") {
                const payload = {
                    name: inputValue,
                    metadata: {
                        steps: workflowState.steps
                    }
                };
                if (editId) await workflowTemplateService.update(editId, payload);
                else await workflowTemplateService.add(payload);
                setWorkflowTemplates(await workflowTemplateService.getAll());
            } else if (modalType === "Shift") {
                const payload = {
                    name: inputValue,
                    metadata: {
                        startTime: shiftState.startTime,
                        endTime: shiftState.endTime,
                        lateLimit: shiftState.lateLimit,
                        workHours: Number(shiftState.workHours)
                    }
                };
                if (editId) await shiftService.update(editId, payload);
                else await shiftService.add(payload);
                setShifts(await shiftService.getAll());
            }
            toast.success(`${modalType} ${editId ? "updated" : "added"} successfully`);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${editId ? "update" : "add"} ${modalType}`);
        } finally {
            setLoading(false);
            setEditId(null);
        }
    };

    // Opens the confirmation modal
    const handleDelete = (type, id) => {
        // Find the item name for better UX
        let item = null;
        if (type === "Employee Type") item = employeeTypes.find(i => i._id === id);
        else if (type === "Leave Type") item = leaveTypes.find(i => i._id === id);
        else if (type === "Employee Document Type") item = documentTypes.find(i => i._id === id);
        else if (type === "Company Document Type") item = companyDocumentTypes.find(i => i._id === id);
        else if (type === "Nationality") item = nationalities.find(i => i._id === id);
        else if (type === "Payroll Rule") item = payrollRules.find(i => i._id === id);
        else if (type === "Payroll Rule") item = payrollRules.find(i => i._id === id);
        else if (type === "Workflow Template") item = workflowTemplates.find(i => i._id === id);
        else if (type === "Shift") item = shifts.find(i => i._id === id);

        setDeleteConfig({ show: true, type, id, name: item ? item.name : "this item" });
    };

    // Actually executes the delete
    const confirmDelete = async () => {
        const { type, id } = deleteConfig;
        if (!type || !id) return;

        setLoading(true);
        try {
            if (type === "Employee Type") {
                await employeeTypeService.delete(id);
                setEmployeeTypes(employeeTypes.filter(i => i._id !== id));
            } else if (type === "Leave Type") {
                await leaveTypeService.delete(id);
                setLeaveTypes(leaveTypes.filter(i => i._id !== id));
            } else if (type === "Employee Document Type") {
                await documentTypeService.delete(id);
                setDocumentTypes(documentTypes.filter(i => i._id !== id));
            } else if (type === "Company Document Type") {
                await companyDocumentTypeService.delete(id);
                setCompanyDocumentTypes(companyDocumentTypes.filter(i => i._id !== id));
            } else if (type === "Nationality") {
                await nationalityService.delete(id);
                setNationalities(nationalities.filter(i => i._id !== id));
            } else if (type === "Payroll Rule") {
                await payrollRuleService.delete(id);
                setPayrollRules(payrollRules.filter(i => i._id !== id));
            } else if (type === "Workflow Template") {
                await workflowTemplateService.delete(id);
                setWorkflowTemplates(workflowTemplates.filter(i => i._id !== id));
            } else if (type === "Shift") {
                await shiftService.delete(id);
                setShifts(shifts.filter(i => i._id !== id));
            }
            toast.success("Deleted successfully");
            setDeleteConfig({ ...deleteConfig, show: false });
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    return {
        employeeTypes,
        leaveTypes,
        documentTypes, // Employee Document Types
        companyDocumentTypes, // Company Document Types
        nationalities,
        payrollRules,
        workflowTemplates,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        loading,
        handleOpenAdd,
        handleOpenEdit,
        handleSave,
        handleDelete, // This now opens the modal
        confirmDelete, // New function for the modal
        deleteConfig, // State for the modal
        setDeleteConfig,
        payrollState,
        setDeleteConfig,
        payrollState,
        setPayrollState,
        shifts,
        shiftState,
        setShiftState,
        workflowState,
        setWorkflowState,
        tempStepName,
        setTempStepName
    };
}
