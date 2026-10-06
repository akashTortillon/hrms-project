import React from "react";

// Checkbox list of the biometric devices set up in Masters > HR Management > Biometric Devices.
// `value` is the list of selected serial numbers (what the employee record stores), so a device
// can be renamed in Masters without breaking the link.
export default function BiometricDevicePicker({ devices = [], value = [], onChange }) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (serial) => {
    onChange(selected.includes(serial) ? selected.filter((s) => s !== serial) : [...selected, serial]);
  };

  // Serials stored on the employee that are no longer in Masters (e.g. device deleted) stay
  // visible, so they aren't silently dropped on the next save.
  const knownSerials = new Set(devices.map((d) => d.code));
  const orphaned = selected.filter((serial) => !knownSerials.has(serial));

  return (
    <div className="form-group">
      <label>Biometric Devices</label>
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px 12px",
          backgroundColor: "white",
          fontSize: "14px"
        }}
      >
        {devices.length === 0 && orphaned.length === 0 ? (
          <span style={{ color: "#6b7280" }}>
            No devices yet. Add them under Masters &rarr; HR Management &rarr; Biometric Devices.
          </span>
        ) : (
          <>
            {devices.map((device) => (
              <label
                key={device._id}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(device.code)}
                  onChange={() => toggle(device.code)}
                />
                <span>{device.name}</span>
                <span style={{ color: "#6b7280", fontSize: "12px" }}>{device.code}</span>
              </label>
            ))}
            {orphaned.map((serial) => (
              <label
                key={serial}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer" }}
              >
                <input type="checkbox" checked onChange={() => toggle(serial)} />
                <span>{serial}</span>
                <span style={{ color: "#b45309", fontSize: "12px" }}>not in Masters</span>
              </label>
            ))}
          </>
        )}
      </div>
      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
        The employee is added to these devices in BioCloud. Leave empty to use the default device setting.
      </p>
    </div>
  );
}
