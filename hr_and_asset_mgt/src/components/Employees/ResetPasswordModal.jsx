import React, { useState, useEffect } from "react";
import CustomModal from "../reusable/CustomModal";
import "../../style/Modal.css";

const DEFAULT_PASSWORD_HINT = "Password@123";

export default function ResetPasswordModal({ show, onClose, employee, onConfirm }) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) setNewPassword("");
  }, [show]);

  if (!employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const passwordToUse = newPassword.trim() || null;
      await onConfirm(passwordToUse);
      onClose();
    } catch (err) {
      // Error toast handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      show={show}
      title="Reset login password"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </>
      }
    >
      <div className="reset-password-modal-body">
        <p className="reset-password-modal-intro">
          Reset login password for <strong>{employee.name}</strong> ({employee.code}).
          They can sign in with <strong>Email</strong> or <strong>Employee ID</strong>.
        </p>
        <div className="reset-password-modal-field">
          <label htmlFor="reset-password-input">New password (optional)</label>
          <input
            id="reset-password-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`Leave blank to use default: ${DEFAULT_PASSWORD_HINT}`}
            className="reset-password-input"
            autoComplete="new-password"
          />
          <p className="reset-password-modal-hint">
            Leave blank to set default password ({DEFAULT_PASSWORD_HINT}). Ask the employee to change it after first login.
          </p>
        </div>
      </div>
    </CustomModal>
  );
}
