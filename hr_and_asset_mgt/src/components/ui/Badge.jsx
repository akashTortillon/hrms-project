
// src/components/ui/Badge.jsx
import React from "react";

export default function Badge({ text, color = "#eee" }) {
  return (
    <span className="badge" style={{ backgroundColor: color, color: "#fff" }}>
      {text}
    </span>
  );
}
