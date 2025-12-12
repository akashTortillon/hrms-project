import { Button as RBButton } from "react-bootstrap";
import "../../style/layout.css";

const variantClass = {
  primary: "btn-primary-custom",
  success: "btn-success-custom",
  danger: "btn-danger-custom",
};

export default function Button({ variant = "primary", children, ...props }) {
  const className = variantClass[variant] ?? variantClass.primary;
  return (
    <RBButton className={className} {...props}>
      {children}
    </RBButton>
  );
}

