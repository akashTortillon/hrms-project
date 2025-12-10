import { svgIcons } from "./svgViewModel.js";

export default function SvgIcon({ name, size = 24, ...props }) {
  const key = Object.keys(svgIcons).find((path) =>
    path.includes(`${name}.svg`)
  );

  if (!key) {
    return (
      <div style={{ fontSize: 12, color: "red" }}>
        Icon "{name}" not found
      </div>
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
