import MastersCard from "./components/MastersCard.jsx";
import { RenderList } from "./components/RenderList.jsx";
import CustomButton from "../../components/reusable/Button";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal.jsx";

import useSystemSettings from "./SystemSettings/useSystemSettings.js";
import "../../style/Masters.css";

export default function SystemSettings() {
  const {
    loading,
    holidays,
    notificationSettings,
    settings,
    handleSettingsChange,
    toggleNotification,
    handleImport,
    handleBackup,
    handleRestore,
    // Modal & Handlers
    showModal,
    setShowModal,
    modalType,
    inputValue,
    setInputValue,
    holidayDate,
    setHolidayDate,
    handleOpenAdd,
    handleOpenEdit,
    handleSave,
    // Delete
    handleDelete,
    confirmDelete,
    deleteConfig,
    setDeleteConfig
  } = useSystemSettings();

  return (
    <div className="system-settings">

      {/* Header */}
      <div className="masters-header">
        <h3>System Settings</h3>
        <p>Configure global system preferences and settings</p>
      </div>

      {/* Global Settings */}
      <MastersCard title="Global Settings">
        <div className="settings-grid">
          <div className="setting-field">
            <label>Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => handleSettingsChange("currency", e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Date Format</label>
            <select
              value={settings.dateFormat}
              onChange={(e) => handleSettingsChange("dateFormat", e.target.value)}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => handleSettingsChange("timezone", e.target.value)}
            >
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Fiscal Year Start</label>
            <select
              value={settings.fiscalYearStart}
              onChange={(e) => handleSettingsChange("fiscalYearStart", e.target.value)}
            >
              <option value="April">April</option>
              <option value="January">January</option>
            </select>
          </div>
        </div>
      </MastersCard>

      {/* Public Holiday Calendar */}
      <MastersCard
        title="Public Holiday Calendar"
        description="UAE-specific holidays"
        onAdd={() => handleOpenAdd("Holiday")}
      >
        <RenderList
          items={holidays}
          type="Holiday"
          handleDelete={handleDelete}
          handleEdit={handleOpenEdit}
        />
      </MastersCard>

      {/* Notification Engine */}
      <MastersCard
        title="Notification Engine"
        description="Configure system notifications"
      >
        <div className="toggle-list">
          {notificationSettings.map(setting => (
            <div key={setting.id} className="toggle-item">
              <div>
                <div className="toggle-title">{setting.title}</div>
                <div className="toggle-desc">{setting.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={setting.enabled}
                onChange={() => toggleNotification(setting.id)}
                className="toggle-switch"
              />
            </div>
          ))}
        </div>
      </MastersCard>

      {/* Data Management */}
      <MastersCard title="Data Management">
        <div className="data-actions">
          <div className="data-action">
            <div>
              <div className="data-title">Bulk Import</div>
              <div className="data-desc">Import employees or assets</div>
            </div>
            <CustomButton onClick={handleImport} size="sm">Import</CustomButton>
          </div>

          <div className="data-action">
            <div>
              <div className="data-title">Backup Data</div>
              <div className="data-desc">Create system backup</div>
            </div>
            <CustomButton onClick={handleBackup} size="sm">Backup</CustomButton>
          </div>

          <div className="data-action bg-red-50 border-red-100">
            <div>
              <div className="data-title text-red-900">Restore</div>
              <div className="data-desc text-red-500">Restore from backup</div>
            </div>
            <CustomButton onClick={handleRestore} variant="danger" size="sm" className="bg-red-600 text-white hover:bg-red-700">Restore</CustomButton>
          </div>
        </div>
      </MastersCard>

      <CustomModal
        show={showModal}
        title={inputValue ? `Edit ${modalType}` : `Add ${modalType}`}
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
        <div className="form-group flex flex-col gap-4">
          {modalType === "Holiday" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. New Year"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
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
          )}
        </div>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={deleteConfig.show}
        itemName={deleteConfig.name}
        onClose={() => setDeleteConfig({ ...deleteConfig, show: false })}
        onConfirm={confirmDelete}
        loading={loading}
      />

    </div>
  );
}
