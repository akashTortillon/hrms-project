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

  return (
    <img
      src={IconSrc}
      width={size}
      height={size}
      alt={name}
      className={`svg-icon ${className}`}
      {...props}
    />
  );
}
