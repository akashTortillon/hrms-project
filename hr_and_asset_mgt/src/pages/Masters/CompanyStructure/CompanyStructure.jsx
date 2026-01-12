import Card from "../../../components/reusable/Card.jsx";
import CustomButton from "../../../components/reusable/Button.jsx";
import SvgIcon from "../../../components/svgIcon/svgView.jsx";
import { Modal, Form, Button } from "react-bootstrap";
import useCompanyStructure from "./useCompanyStructure.js"; // Import the custom hook
import "../../../style/Masters.css";
import { RenderList } from "../components/RenderList.jsx";

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
        <Card title="Departments" className="structure-card">
          <div className="structure-header-action">
            <CustomButton size="sm" onClick={() => handleOpenAdd("Department")}>+ Add</CustomButton>
          </div>
          <RenderList items={departments} type="Department" handleDelete={handleDelete} />
        </Card>

        {/* Branches */}
        <Card title="Branches" className="structure-card">
          <div className="structure-header-action">
            <div className="structure-header-action">
              <CustomButton size="sm" onClick={() => handleOpenAdd("Branch")}>+ Add</CustomButton>
            </div>
          </div>
          <RenderList items={branches} type="Branch" />
        </Card>
      </div>

      {/* Designations (Full Width) */}
      <div className="mt-4">
        <Card title="Designations" className="structure-card">
          <div className="structure-header-action">
            <div className="structure-header-action">
              <CustomButton size="sm" onClick={() => handleOpenAdd("Designation")}>+ Add</CustomButton>
            </div>
          </div>
          <RenderList items={designations} type="Designation" />
        </Card>
      </div>

      {/* Add Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add {modalType}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>{modalType} Name</Form.Label>
            <Form.Control
              type="text"
              placeholder={`Enter ${modalType} Name`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}
