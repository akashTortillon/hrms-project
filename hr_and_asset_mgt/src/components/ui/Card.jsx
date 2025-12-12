
// src/components/ui/Card.jsx
import React from "react";
import "../../styles/layout.css";

export default function Card({ title, headerRight, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <div className="card-title">{title}</div>
          <div className="card-actions">{headerRight}</div>
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
