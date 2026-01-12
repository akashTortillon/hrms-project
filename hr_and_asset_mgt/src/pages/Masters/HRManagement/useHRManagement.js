import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    employeeTypeService,
    leaveTypeService,
    documentTypeService,
    nationalityService,
    payrollRuleService,
    workflowTemplateService
} from "../../../services/masterService";

export default function useHRManagement() {
    const [employeeTypes, setEmployeeTypes] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [nationalities, setNationalities] = useState([]);
    const [payrollRules, setPayrollRules] = useState([]);
    const [workflowTemplates, setWorkflowTemplates] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try { setEmployeeTypes(await employeeTypeService.getAll()); } catch (e) { console.error(e); }
        try { setLeaveTypes(await leaveTypeService.getAll()); } catch (e) { console.error(e); }
        try { setDocumentTypes(await documentTypeService.getAll()); } catch (e) { console.error(e); }
        try { setNationalities(await nationalityService.getAll()); } catch (e) { console.error(e); }
        try { setPayrollRules(await payrollRuleService.getAll()); } catch (e) { console.error(e); }
        try { setWorkflowTemplates(await workflowTemplateService.getAll()); } catch (e) { console.error(e); }
    };

    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);

        try {
            if (modalType === "Employee Type") {
                await employeeTypeService.add(inputValue);
                setEmployeeTypes(await employeeTypeService.getAll());
            } else if (modalType === "Leave Type") {
                await leaveTypeService.add(inputValue);
                setLeaveTypes(await leaveTypeService.getAll());
            } else if (modalType === "Document Type") {
                await documentTypeService.add(inputValue);
                setDocumentTypes(await documentTypeService.getAll());
            } else if (modalType === "Nationality") {
                await nationalityService.add(inputValue);
                setNationalities(await nationalityService.getAll());
            } else if (modalType === "Payroll Rule") {
                await payrollRuleService.add(inputValue);
                setPayrollRules(await payrollRuleService.getAll());
            } else if (modalType === "Workflow Template") {
                await workflowTemplateService.add(inputValue);
                setWorkflowTemplates(await workflowTemplateService.getAll());
            }
            toast.success(`${modalType} added successfully`);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to add ${modalType}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            if (type === "Employee Type") {
                await employeeTypeService.delete(id);
                setEmployeeTypes(employeeTypes.filter(i => i._id !== id));
            } else if (type === "Leave Type") {
                await leaveTypeService.delete(id);
                setLeaveTypes(leaveTypes.filter(i => i._id !== id));
            } else if (type === "Document Type") {
                await documentTypeService.delete(id);
                setDocumentTypes(documentTypes.filter(i => i._id !== id));
            } else if (type === "Nationality") {
                await nationalityService.delete(id);
                setNationalities(nationalities.filter(i => i._id !== id));
            } else if (type === "Payroll Rule") {
                await payrollRuleService.delete(id);
                setPayrollRules(payrollRules.filter(i => i._id !== id));
            } else if (type === "Workflow Template") {
                await workflowTemplateService.delete(id);
                setWorkflowTemplates(workflowTemplates.filter(i => i._id !== id));
            }
            toast.success("Deleted successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        }
    };

    return {
        employeeTypes,
        leaveTypes,
        documentTypes,
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
        handleSave,
        handleDelete
    };
}
