import React from "react";
import PropTypes from "prop-types";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/components/StatCard.css";

/**
 * reusable StatCard component with "Lift & Shadow" hover effect.
 * 
 * @param {string} title - Title of the mechanic (e.g. "Total Employees")
 * @param {string|number} value - Main value (e.g. "150", "AED 5,000")
 * @param {string} subtext - Secondary text (e.g. "+5 this month")
 * @param {string} iconName - Name of the SVG Icon to display
 * @param {string} colorVariant - 'blue', 'green', 'yellow', 'red', 'gray' (controls icon bg)
 * @param {string} trend - 'positive', 'negative', 'neutral' (controls subtext color)
 */
const StatCard = ({
  title,
  value,
  subtext,
  iconName,
  colorVariant = "blue",
  onClick
}) => {
  // Normalize vibrant variants or map classic colors to vibrant ones for global luxury
  const normalizedVariant = colorVariant.startsWith("vibrant-")
    ? colorVariant
    : `vibrant-${colorVariant}`;

  return (
    <div
      className={`stat-card-modern luxury-card vibrant-card ${normalizedVariant}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* VIBRANT LUXURY LAYOUT */}
      <div className="luxury-glow" />

      <div className="stat-card-inner-content">
        <div className="stat-card-header-row">
          {iconName && (
            <div className={`stat-card-icon-glass luxury-icon-wrapper`}>
              <SvgIcon name={iconName} size={20} />
            </div>
          )}
        </div>

        <div className="stat-card-body">
          <span className="stat-card-label">{title}</span>
          <div className="stat-card-value-group">
            <span className="stat-card-value">{value}</span>
            {subtext && <span className="stat-card-subtext">{subtext}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtext: PropTypes.any,
  iconName: PropTypes.string,
  colorVariant: PropTypes.oneOf(['blue', 'green', 'yellow', 'red', 'orange', 'gray']),
  onClick: PropTypes.func
};

export default StatCard;
