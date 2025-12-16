
import React from "react";
import Card from "./Card.jsx";
import SvgIcon from "../svgIcon/svgView.jsx";
import "../../style/Dashboard.css";

export default function DashboardInfoCard({
  title,
  icon,
  actionLabel,
  onActionClick,
  items = [],
}) {
  return (
    <Card className="dashboard-info-card">
      {/* Header */}
      <div className="dashboard-info-card-header">
        <div className="dashboard-info-card-title">
          <SvgIcon name={icon} size={18} />
          <span>{title}</span>
        </div>

        {actionLabel && (
          <button
            className="dashboard-info-card-action"
            onClick={onActionClick}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="dashboard-info-card-body">
        {items.map((item) => (
          <div key={item.id} className="dashboard-info-row">
            {/* LEFT SECTION */}
            {/* LEFT SECTION (hide for progress items) */}
                {!item.progress && (
                <div className="dashboard-info-left">
                    <div className="dashboard-info-primary">
                    {item.primaryText}
                    </div>

                    {item.secondaryText && (
                    <div className="dashboard-info-secondary">
                        {item.secondaryText}
                    </div>
                    )}
                </div>
                )}


            {/* RIGHT SECTION */}
            <div className="dashboard-info-right">
              {/* Badge (Documents / Visa cards) */}
              {item.badge && (
                <span
                  className={`dashboard-info-badge ${item.badge.variant}`}
                >
                  {item.badge.text}
                </span>
              )}

              {/* Date */}
              {item.dateText && (
                <div className="dashboard-info-date">
                  {item.dateText}
                </div>
              )}

              {/* Action buttons (Pending Approvals) */}
              {item.actions && (
                <div className="dashboard-info-actions">
                  {item.actions.map((action, index) => (
                    <button
                      key={index}
                      className={`dashboard-action-btn ${action.variant}`}
                      onClick={action.onClick}
                    >
                      <SvgIcon name={action.icon} size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PROGRESS SECTION (Today's Attendance) */}
            {item.progress && (
              <div className="dashboard-info-progress">
                <div className="dashboard-info-progress-header">
                  <span className="dashboard-info-progress-title">
                    {item.primaryText}
                  </span>
                  <span className="dashboard-info-progress-count">
                    {item.progress.present}/{item.progress.total}
                  </span>
                </div>

                <div className="dashboard-progress-bar">
                  <div
                    className="dashboard-progress-present"
                    style={{
                      width: `${
                        (item.progress.present /
                          item.progress.total) *
                        100
                      }%`,
                    }}
                  />

                  {/* Leave */}
                <div
                    className="dashboard-progress-leave"
                    style={{
                    width: `${(item.progress.leave / item.progress.total) * 100}%`,
                    }}
                />

                {/* Absent */}
                <div
                    className="dashboard-progress-absent"
                    style={{
                    width: `${(item.progress.absent / item.progress.total) * 100}%`,
                    }}
                />
                </div>

                

                <div className="dashboard-progress-legend">
                  <span>✓ {item.progress.present} Present</span>
                  <span>○ {item.progress.leave} Leave</span>
                  <span>× {item.progress.absent} Absent</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
