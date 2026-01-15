import { svgIcons } from "./svgViewModel.js";
import "../../style/layout.css";

export default function SvgIcon({ name, size = 24, className = "", ...props }) {
  const key = Object.keys(svgIcons).find((path) =>
    path.toLowerCase().includes(`${name}.svg`.toLowerCase())
  );

  if (!key) {
    return <span className="icon-missing">Icon "{name}" not found</span>;
  }

  const IconSrc = svgIcons[key];

  let colorClass = "";
  const lowerName = name.toLowerCase();

  // Logic to auto-color specific icons if requested
  if (lowerName.includes("delete") || lowerName.includes("trash") || lowerName.includes("remove")) {
    colorClass = "svg-icon-red";
  } else if (lowerName.includes("edit") || lowerName.includes("pencil") || lowerName.includes("create") || lowerName.includes("eye") || lowerName.includes("view")) {
    colorClass = "svg-icon-blue";
  } else if (lowerName.includes("download") || lowerName.includes("save")) {
    colorClass = "svg-icon-green";
  } else if (lowerName.includes("upload") || lowerName.includes("plus") || lowerName.includes("add")) {
    colorClass = "svg-icon-white";
  }

  return (
    <img
      src={IconSrc}
      width={size}
      height={size}
      alt={name}
      className={`svg-icon ${colorClass} ${className}`}
      {...props}
    />
  );
}
