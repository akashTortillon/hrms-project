// src/components/ui/ListItem.jsx
import React from "react";
import Badge from "./Badge";

export default function ListItem({ title, subtitle, meta, status, actions }) {
  return (
    <div className="list-item">
      <div className="li-left">
        <div className="li-title">{title}</div>
        <div className="li-sub">{subtitle}</div>
      </div>
      <div className="li-right">
        {status && <Badge text={status.text} color={status.color} />}
        <div className="li-meta">{meta}</div>
        <div className="li-actions">{actions}</div>
      </div>
    </div>
  );
}
