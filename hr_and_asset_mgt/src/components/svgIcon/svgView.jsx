import { svgIcons } from "./svgViewModel.js";

export default function SvgIcon({ name, size = 24, ...props }) {
  const key = Object.keys(svgIcons).find((path) =>
    path.includes(`${name}.svg`)
  );

  if (!key) {
    return (
      <span style={{ color: "red", fontSize: 12 }}>
        Icon "{name}" not found
      </span>
    );
  }

  const IconSrc = svgIcons[key];

  return (
    <img
      src={IconSrc}
      width={size}
      height={size}
      alt={name}
      {...props}
    />
  );
}
