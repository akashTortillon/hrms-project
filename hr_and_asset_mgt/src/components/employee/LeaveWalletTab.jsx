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
            return (
              <div
                key={w.leaveTypeId}
                onClick={() => setSelectedType(w)}
                style={{
                  background: bg, borderRadius: "12px", padding: "18px",
                  border: isSelected ? `2px solid ${tc}` : `1px solid ${bg}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: "13px", color: tc, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  {w.leaveTypeName} {!w.isPaid && <span style={{ fontWeight: 500 }}>(Unpaid)</span>}
                </div>
                <div style={{ fontSize: "30px", fontWeight: "800", color: w.balanceDays < 0 ? "#dc2626" : tc }}>
                  {w.balanceDays}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  {w.creditedDays} credited · {w.usedDays} used
                </div>
                {w.overrideDays != null && (
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Custom allocation: {w.overrideDays}/cycle</div>
                )}
                {w.pendingDeductionAmount > 0 && (
                  <div style={{ marginTop: "8px", padding: "6px 8px", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#991b1b" }}>
                    Salary deduction owed: <strong>{w.pendingDeductionAmount.toFixed(2)}</strong> ({w.pendingDeductionDays}d) — apply via Payroll
                  </div>
                )}
                {w.pendingRefundAmount > 0 && (
                  <div style={{ marginTop: "8px", padding: "6px 8px", background: "#fff", borderRadius: "6px", fontSize: "12px", color: "#166534", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                    <span>Refund pending: <strong>{w.pendingRefundAmount.toFixed(2)}</strong> ({w.pendingRefundDays}d)</span>
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClearRefund(w.leaveTypeId); }}
                        style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                )}
                {canManage && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOverrideModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, value: w.overrideDays ?? "" }); }}
                      style={{ fontSize: "11px", color: tc, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Override
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAdvanceModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, days: "", remarks: "" }); }}
                      style={{ fontSize: "11px", color: tc, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Grant Advance
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMigrationModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, openingCredit: "", usedDays: "", remarks: "" }); }}
                      style={{ fontSize: "11px", color: tc, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
                    >
                      Migrate Balance
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAdjustModal({ leaveTypeId: w.leaveTypeId, leaveTypeName: w.leaveTypeName, days: "", reason: "" }); }}
                      style={{ fontSize: "11px", color: tc, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
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
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
              {ledger.map((entry) => (
                <div
                  key={entry._id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "13px"
                  }}
                >
                  <div>
                    <span style={{ color: "#1f2937", fontWeight: 600 }}>{entry.transactionType.replace(/_/g, " ")}</span>
                    <span style={{ color: "#9ca3af", marginLeft: "10px" }}>
                      {new Date(entry.transactionDate).toLocaleDateString()}
                    </span>
                    {entry.remarks && <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{entry.remarks}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: entry.days >= 0 ? "#166534" : "#991b1b" }}>
                    {entry.days >= 0 ? "+" : ""}{entry.days}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {overrideModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "360px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "16px" }}>Allocation Override — {overrideModal.leaveTypeName}</h4>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Custom days per cycle (blank = use default)</label>
            <input
              type="number"
              value={overrideModal.value}
              onChange={(e) => setOverrideModal({ ...overrideModal, value: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setOverrideModal(null)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveOverride} disabled={saving} style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {migrationModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "380px" }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Migrate Excel Balance — {migrationModal.leaveTypeName}</h4>
            <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "14px" }}>One-time entry to bring the employee's historical balance from Excel into the wallet.</p>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Opening Credit (total days ever earned)</label>
            <input
              type="number"
              value={migrationModal.openingCredit}
              onChange={(e) => setMigrationModal({ ...migrationModal, openingCredit: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "12px" }}
            />
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Used Days (already taken historically)</label>
            <input
              type="number"
              value={migrationModal.usedDays}
              onChange={(e) => setMigrationModal({ ...migrationModal, usedDays: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "12px" }}
            />
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Remarks</label>
            <textarea
              rows={2}
              value={migrationModal.remarks}
              onChange={(e) => setMigrationModal({ ...migrationModal, remarks: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px" }}
              placeholder="e.g. Migrated from Excel — joined 12 Jul 2022"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setMigrationModal(null)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveMigration} disabled={saving} style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "380px" }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Adjust Balance — {adjustModal.leaveTypeName}</h4>
            <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "14px" }}>
              For ongoing operational corrections to the current balance — not a historical
              migration. Use a positive number to credit days, negative to deduct.
            </p>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Days (e.g. 2 or -1)</label>
            <input
              type="number"
              value={adjustModal.days}
              onChange={(e) => setAdjustModal({ ...adjustModal, days: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "12px" }}
            />
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Reason</label>
            <textarea
              rows={2}
              value={adjustModal.reason}
              onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px" }}
              placeholder="Required — e.g. Correction for missed check-in on public holiday"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setAdjustModal(null)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveAdjustment} disabled={saving} style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {advanceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "380px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "16px" }}>Grant Advance Leave — {advanceModal.leaveTypeName}</h4>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Days</label>
            <input
              type="number"
              value={advanceModal.days}
              onChange={(e) => setAdvanceModal({ ...advanceModal, days: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "12px" }}
            />
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Remarks</label>
            <textarea
              rows={2}
              value={advanceModal.remarks}
              onChange={(e) => setAdvanceModal({ ...advanceModal, remarks: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "8px" }}
            />
            <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>
              This grants leave before eligibility — wallet balance will go negative. The salary deduction (days × current daily rate) is calculated and locked automatically; apply it via Payroll's manual adjustment for this employee's current cycle. When eligibility is reached, the exact same amount is flagged for refund.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setAdvanceModal(null)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleGrantAdvance} disabled={saving} style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
                {saving ? "Saving..." : "Grant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
