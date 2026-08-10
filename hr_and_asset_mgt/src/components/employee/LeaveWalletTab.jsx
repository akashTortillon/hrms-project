import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  getEmployeeWallets,
  getEmployeeLedger,
  setAllocationOverride,
  grantAdvanceLeave,
  clearPendingRefund,
  createMigrationEntry,
  adjustBalance
} from "../../services/leaveWalletService.js";
import { useRole } from "../../contexts/RoleContext.jsx";
import CustomModal from "../reusable/CustomModal.jsx";
import AppButton from "../reusable/Button.jsx";
import "../../style/LeaveWalletTab.css";

const CARD_COLORS = ["#eff6ff", "#f0fdf4", "#fefce8", "#fdf4ff", "#fff7ed", "#f0f9ff"];
const CARD_TEXT = ["#1d4ed8", "#15803d", "#a16207", "#7e22ce", "#c2410c", "#0c4a6e"];

export default function LeaveWalletTab({ employeeId }) {
  const { hasPermission } = useRole();
  const canManage = hasPermission("ALL") || hasPermission("MANAGE_EMPLOYEES");

  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [overrideModal, setOverrideModal] = useState(null); // { leaveTypeId, leaveTypeName, value }
  const [advanceModal, setAdvanceModal] = useState(null); // { leaveTypeId, leaveTypeName, days, remarks }
  const [migrationModal, setMigrationModal] = useState(null); // { leaveTypeId, leaveTypeName, openingCredit, usedDays, remarks }
  const [adjustModal, setAdjustModal] = useState(null); // { leaveTypeId, leaveTypeName, days, reason }
  const [saving, setSaving] = useState(false);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const res = await getEmployeeWallets(employeeId);
      setWallets(res.data || []);
    } catch {
      toast.error("Failed to load leave wallet");
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (leaveTypeId) => {
    setLedgerLoading(true);
    try {
      const res = await getEmployeeLedger(employeeId, leaveTypeId);
      setLedger(res.data || []);
    } catch {
      toast.error("Failed to load leave ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) loadWallets();
  }, [employeeId]);

  useEffect(() => {
    if (selectedType) loadLedger(selectedType.leaveTypeId);
  }, [selectedType]);

  const handleSaveOverride = async () => {
    setSaving(true);
    try {
      await setAllocationOverride(employeeId, {
        leaveTypeId: overrideModal.leaveTypeId,
        overrideDays: overrideModal.value === "" ? null : Number(overrideModal.value)
      });
      toast.success("Allocation override saved");
      setOverrideModal(null);
      loadWallets();
    } catch {
      toast.error("Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  const handleGrantAdvance = async () => {
    if (!advanceModal.days || Number(advanceModal.days) <= 0) {
      return toast.warning("Enter a valid number of days");
    }
    setSaving(true);
    try {
      const res = await grantAdvanceLeave(employeeId, {
        leaveTypeId: advanceModal.leaveTypeId,
        days: Number(advanceModal.days),
        remarks: advanceModal.remarks
      });
      toast.success(res.message || "Advance leave granted.");
      setAdvanceModal(null);
      loadWallets();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to grant advance leave");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMigration = async () => {
    if (migrationModal.openingCredit === "" || migrationModal.usedDays === "") {
      return toast.warning("Enter both opening credit and used days");
    }
    setSaving(true);
    try {
      await createMigrationEntry({
        employeeId,
        leaveTypeId: migrationModal.leaveTypeId,
        openingCredit: Number(migrationModal.openingCredit),
        usedDays: Number(migrationModal.usedDays),
        remarks: migrationModal.remarks
      });
      toast.success("Migration entry recorded");
      setMigrationModal(null);
      loadWallets();
    } catch {
      toast.error("Failed to record migration entry");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdjustment = async () => {
    const delta = Number(adjustModal.days);
    if (!adjustModal.days || delta === 0 || Number.isNaN(delta)) {
      return toast.warning("Enter a non-zero number of days (use a negative number to deduct)");
    }
    if (!adjustModal.reason || !adjustModal.reason.trim()) {
      return toast.warning("A reason is required for a manual adjustment");
    }
    setSaving(true);
    try {
      const res = await adjustBalance(employeeId, {
        leaveTypeId: adjustModal.leaveTypeId,
        days: delta,
        reason: adjustModal.reason
      });
      toast.success(res.message || "Balance adjusted");
      setAdjustModal(null);
      loadWallets();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to adjust balance");
    } finally {
      setSaving(false);
    }
  };

  const handleClearRefund = async (leaveTypeId) => {
    try {
      await clearPendingRefund(employeeId, leaveTypeId);
      toast.success("Refund marked as paid");
      loadWallets();
    } catch {
      toast.error("Failed to clear refund");
    }
  };

  if (loading) return <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px" }}>Loading...</div>;

  return (
    <div style={{ padding: "8px 0" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1f2937", fontWeight: "700" }}>💳 Leave Wallet</h3>

      {wallets.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px", background: "#f9fafb", borderRadius: "12px" }}>
          No leave types configured. Add Leave Types under Masters → HR Management.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {wallets.map((w, idx) => {
            const bg = CARD_COLORS[idx % CARD_COLORS.length];
            const tc = CARD_TEXT[idx % CARD_TEXT.length];
            const isSelected = selectedType?.leaveTypeId === w.leaveTypeId;
            // Progress = fraction of the credited allowance already used. A negative
            // balance (advance leave) shows a full/overflowing bar in the danger color
            // instead of a meaningless >100% width.
            const progressPct = w.creditedDays > 0
              ? Math.min(100, Math.max(0, (w.usedDays / w.creditedDays) * 100))
              : (w.balanceDays < 0 ? 100 : 0);
            const progressColor = w.balanceDays < 0 ? "#dc2626" : tc;

            return (
              <div
                key={w.leaveTypeId}
                onClick={() => setSelectedType(w)}
                className={`wallet-card${isSelected ? " selected" : ""}`}
                style={{ background: bg, border: `1px solid ${bg}` }}
              >
                <div className="wallet-card-title" style={{ color: tc }}>
                  {w.leaveTypeName} {!w.isPaid && <span style={{ fontWeight: 500 }}>(Unpaid)</span>}
                </div>

                <div className="wallet-progress-track">
                  <div className="wallet-progress-fill" style={{ width: `${progressPct}%`, background: progressColor }} />
                </div>

                <div className="wallet-balance-row">
                  <span className="wallet-balance-number" style={{ color: w.balanceDays < 0 ? "#dc2626" : tc }}>
                    {w.balanceDays}
                  </span>
                  <span className="wallet-balance-label">days remaining</span>
                </div>
                <div className="wallet-meta">
                  {w.creditedDays} credited · {w.usedDays} used
                </div>
                {w.overrideDays != null && (
                  <div className="wallet-override-note">Custom allocation: {w.overrideDays}/cycle</div>
                )}
                {w.pendingDeductionAmount > 0 && (
                  <div className="wallet-banner owed">
                    <span>Salary deduction owed: <strong>{w.pendingDeductionAmount.toFixed(2)}</strong> ({w.pendingDeductionDays}d) — apply via Payroll</span>
                  </div>
                )}
                {w.pendingRefundAmount > 0 && (
                  <div className="wallet-banner refund">
                    <span>Refund pending: <strong>{w.pendingRefundAmount.toFixed(2)}</strong> ({w.pendingRefundDays}d)</span>
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClearRefund(w.leaveTypeId); }}
                        className="wallet-pill-btn"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                )}
                {canManage && (
                  <div className="wallet-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOverrideModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, value: w.overrideDays ?? "" }); }}
                      className="wallet-action-btn"
                    >
                      Override
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAdvanceModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, days: "", remarks: "" }); }}
                      className="wallet-action-btn"
                    >
                      Grant Advance
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMigrationModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, openingCredit: "", usedDays: "", remarks: "" }); }}
                      className="wallet-action-btn"
                    >
                      Migrate Balance
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAdjustModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, days: "", reason: "" }); }}
                      className="wallet-action-btn"
                    >
                      Adjust Balance
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedType && (
        <div>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1f2937", fontWeight: "700" }}>
            Ledger — {selectedType.leaveTypeName}
          </h4>
          {ledgerLoading ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}>Loading...</div>
          ) : ledger.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px", background: "#f9fafb", borderRadius: "10px" }}>
              No transactions yet.
            </div>
          ) : (
            <div className="wallet-timeline">
              {ledger.map((entry, idx) => {
                const isCredit = entry.days >= 0;
                return (
                  <div key={entry._id} className="wallet-timeline-entry">
                    <div className="wallet-timeline-rail">
                      <div className={`wallet-timeline-dot ${isCredit ? "credit" : "debit"}`} />
                      {idx < ledger.length - 1 && <div className="wallet-timeline-line" />}
                    </div>
                    <div className="wallet-timeline-content">
                      <div className="wallet-timeline-header">
                        <span className="wallet-timeline-type">{entry.transactionType.replace(/_/g, " ")}</span>
                        <span className={`wallet-timeline-days ${isCredit ? "credit" : "debit"}`}>
                          {isCredit ? "+" : ""}{entry.days}
                        </span>
                      </div>
                      <div className="wallet-timeline-date">{new Date(entry.transactionDate).toLocaleDateString()}</div>
                      {entry.remarks && <div className="wallet-timeline-remarks">{entry.remarks}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CustomModal
        show={!!overrideModal}
        title={`Allocation Override — ${overrideModal?.leaveTypeName || ""}`}
        onClose={() => setOverrideModal(null)}
        width="380px"
        footer={overrideModal && (
          <>
            <AppButton variant="secondary" onClick={() => setOverrideModal(null)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleSaveOverride} disabled={saving}>{saving ? "Saving..." : "Save"}</AppButton>
          </>
        )}
      >
        {overrideModal && (
          <div className="wallet-modal-body">
            <div className="modal-form-group">
              <label className="modal-label">Custom days per cycle (blank = use default)</label>
              <input
                type="number"
                className="modal-input"
                value={overrideModal.value}
                onChange={(e) => setOverrideModal({ ...overrideModal, value: e.target.value })}
              />
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        show={!!migrationModal}
        title={`Migrate Excel Balance — ${migrationModal?.leaveTypeName || ""}`}
        onClose={() => setMigrationModal(null)}
        width="400px"
        footer={migrationModal && (
          <>
            <AppButton variant="secondary" onClick={() => setMigrationModal(null)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleSaveMigration} disabled={saving}>{saving ? "Saving..." : "Save"}</AppButton>
          </>
        )}
      >
        {migrationModal && (
          <div className="wallet-modal-body">
            <p className="modal-help-text">One-time entry to bring the employee's historical balance from Excel into the wallet.</p>
            <div className="modal-form-group">
              <label className="modal-label">Opening Credit (total days ever earned)</label>
              <input
                type="number"
                className="modal-input"
                value={migrationModal.openingCredit}
                onChange={(e) => setMigrationModal({ ...migrationModal, openingCredit: e.target.value })}
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Used Days (already taken historically)</label>
              <input
                type="number"
                className="modal-input"
                value={migrationModal.usedDays}
                onChange={(e) => setMigrationModal({ ...migrationModal, usedDays: e.target.value })}
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Remarks</label>
              <textarea
                rows={2}
                className="modal-input"
                value={migrationModal.remarks}
                onChange={(e) => setMigrationModal({ ...migrationModal, remarks: e.target.value })}
                placeholder="e.g. Migrated from Excel — joined 12 Jul 2022"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        show={!!adjustModal}
        title={`Adjust Balance — ${adjustModal?.leaveTypeName || ""}`}
        onClose={() => setAdjustModal(null)}
        width="400px"
        footer={adjustModal && (
          <>
            <AppButton variant="secondary" onClick={() => setAdjustModal(null)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleSaveAdjustment} disabled={saving}>{saving ? "Saving..." : "Save"}</AppButton>
          </>
        )}
      >
        {adjustModal && (
          <div className="wallet-modal-body">
            <p className="modal-help-text">
              For ongoing operational corrections to the current balance — not a historical
              migration. Use a positive number to credit days, negative to deduct.
            </p>
            <div className="modal-form-group">
              <label className="modal-label">Days (e.g. 2 or -1)</label>
              <input
                type="number"
                className="modal-input"
                value={adjustModal.days}
                onChange={(e) => setAdjustModal({ ...adjustModal, days: e.target.value })}
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Reason</label>
              <textarea
                rows={2}
                className="modal-input"
                value={adjustModal.reason}
                onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                placeholder="Required — e.g. Correction for missed check-in on public holiday"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        )}
      </CustomModal>

      <CustomModal
        show={!!advanceModal}
        title={`Grant Advance Leave — ${advanceModal?.leaveTypeName || ""}`}
        onClose={() => setAdvanceModal(null)}
        width="400px"
        footer={advanceModal && (
          <>
            <AppButton variant="secondary" onClick={() => setAdvanceModal(null)}>Cancel</AppButton>
            <AppButton variant="warning" onClick={handleGrantAdvance} disabled={saving}>{saving ? "Saving..." : "Grant"}</AppButton>
          </>
        )}
      >
        {advanceModal && (
          <div className="wallet-modal-body">
            <div className="modal-form-group">
              <label className="modal-label">Days</label>
              <input
                type="number"
                className="modal-input"
                value={advanceModal.days}
                onChange={(e) => setAdvanceModal({ ...advanceModal, days: e.target.value })}
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Remarks</label>
              <textarea
                rows={2}
                className="modal-input"
                value={advanceModal.remarks}
                onChange={(e) => setAdvanceModal({ ...advanceModal, remarks: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>
            <p className="modal-help-text">
              This grants leave before eligibility — wallet balance will go negative. The salary
              deduction (days × current daily rate) is calculated and locked automatically; apply
              it via Payroll's manual adjustment for this employee's current cycle. When
              eligibility is reached, the exact same amount is flagged for refund.
            </p>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
