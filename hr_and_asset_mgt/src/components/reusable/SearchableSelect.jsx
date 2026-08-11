import React, { useState, useRef, useEffect } from "react";

// Drop-in replacement for a plain <select> with an unfiltered list of options.
// Fires onChange with the same { target: { name, value } } shape a native
// <select onChange> gives, so it works with existing handleChange(e) handlers.
export default function SearchableSelect({ name, value, onChange, options, placeholder = "Select...", emptyLabel = "Select..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const pick = (val) => {
    onChange({ target: { name, value: val } });
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          backgroundColor: "white",
          fontSize: "14px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: selected ? "#111827" : "#6b7280",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : emptyLabel}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            maxHeight: "260px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", padding: "6px", borderBottom: "1px solid #e5e7eb" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
              style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                width: "100%",
                padding: "8px 8px 8px 30px",
                border: "none",
                outline: "none",
                fontSize: "13px",
                borderRadius: "6px",
              }}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            <div
              onClick={() => pick("")}
              style={{ padding: "9px 12px", cursor: "pointer", fontSize: "14px", color: "#6b7280" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {emptyLabel}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: "9px 12px", fontSize: "13px", color: "#9ca3af" }}>No matches</div>
            )}
            {filtered.map((o) => (
              <div
                key={o.value}
                onClick={() => pick(o.value)}
                style={{
                  padding: "9px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  background: String(o.value) === String(value) ? "#eff6ff" : "transparent",
                  color: "#111827",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = String(o.value) === String(value) ? "#eff6ff" : "transparent")}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
