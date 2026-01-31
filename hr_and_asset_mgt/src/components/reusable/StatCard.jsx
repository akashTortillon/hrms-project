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
  return (
    <div
      className="stat-card-modern"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-value">{value}</span>
        {subtext && <span className="stat-card-subtext">{subtext}</span>}
      </div>

      {iconName && (
        <div className={`stat-card-icon stat-icon-${colorVariant}`}>
          <SvgIcon name={iconName} size={24} />
        </div>
      )}
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
