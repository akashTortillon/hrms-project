import Card from "../../../components/reusable/Card.jsx";
import CustomButton from "../../../components/reusable/Button.jsx";
import SvgIcon from "../../../components/svgIcon/svgView.jsx";
import { Modal, Form, Button } from "react-bootstrap";
import useCompanyStructure from "./useCompanyStructure.js"; // Import the custom hook
import "../../../style/Masters.css";
import { RenderList } from "../components/RenderList.jsx";
import CustomModal from "../../../components/reusable/CustomModal.jsx";

export default function CompanyStructure() {
  const {
    departments,
    branches,
    designations,
    showModal,
    setShowModal,
    modalType,
    inputValue,
    setInputValue,
    loading,
    handleOpenAdd,
    handleSave,
    handleDelete
  } = useCompanyStructure();



  return (
    <div className="company-structure">

      {/* Header */}
      <div className="company-structure-header">
        <h2 className="company-structure-title">Company Structure Masters</h2>
        <p className="company-structure-subtitle">
          Define departments, branches, and organizational hierarchy
        </p>
      </div>

      <div className="structure-grid">
        {/* Departments */}
        <Card
          title="Departments"
          className="structure-card"
          rightAction={
            <CustomButton size="sm" onClick={() => handleOpenAdd("Department")}>+ Add</CustomButton>
          }
        >
          <RenderList items={departments} type="Department" handleDelete={handleDelete} />
        </Card>

        {/* Branches */}
        <Card
          title="Branches"
          className="structure-card"
          rightAction={
            <CustomButton size="sm" onClick={() => handleOpenAdd("Branch")}>+ Add</CustomButton>
          }
        >
          <RenderList items={branches} type="Branch" />
        </Card>
      </div>

      {/* Designations (Full Width) */}
      <div className="mt-4">
        <Card
          title="Designations"
          className="structure-card"
          rightAction={
            <CustomButton size="sm" onClick={() => handleOpenAdd("Designation")}>+ Add</CustomButton>
          }
        >
          <RenderList items={designations} type="Designation" />
        </Card>
      </div>

      {/* Add Modal */}
      {/* Custom Modal */}
      <CustomModal
        show={showModal}
        title={`Add ${modalType}`}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <CustomButton variant="secondary" onClick={() => setShowModal(false)} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Cancel
            </CustomButton>
            <CustomButton onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </CustomButton>
          </>
        }
      >
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">{modalType} Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Enter ${modalType} Name`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>
      </CustomModal>

    </div>
  );
}
