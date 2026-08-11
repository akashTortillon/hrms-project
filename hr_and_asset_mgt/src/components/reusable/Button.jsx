import { Button as RBButton } from "react-bootstrap";
import "../../style/layout.css";

const variantClass = {
  primary: "btn-primary-custom",
  success: "btn-success-custom",
  danger: "btn-danger-custom",
  secondary: "btn-secondary-custom",
  warning: "btn-warning-custom",
};

export default function Button({ variant = "primary", children, className = "", ...props }) {
  const safeVariant = variantClass[variant] ? variant : "primary";
  const mapped = variantClass[safeVariant];
  // Pass `variant` through to RBButton explicitly (all 5 names above are real
  // Bootstrap variant names) instead of leaving it unset - react-bootstrap's Button
  // defaults its OWN variant to "primary" whenever the prop is omitted, which used to
  // silently inject Bootstrap's blue `btn-primary` alongside our custom class on every
  // variant. That went unnoticed for success/danger only because Bootstrap's own
  // green/red happened to coincide with ours - it was never actually overridden, and
  // "secondary" (grey intended) rendered as plain Bootstrap blue as a result.
  return (
    <RBButton variant={safeVariant} className={`${mapped} ${className}`.trim()} {...props}>
      {children}
    </RBButton>
  );
}

