import { Card as RBCard } from "react-bootstrap";
import "../../style/layout.css";

export default function Card({ title, subtitle, rightAction, children, className = "" }) {
  return (
    <RBCard className={`card-container ${className}`}>
      {(title || subtitle || rightAction) && (
        <RBCard.Header className="card-header d-flex justify-content-between align-items-center">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {rightAction && <div className="card-action">{rightAction}</div>}
        </RBCard.Header>
      )}
      <RBCard.Body className="card-body">{children}</RBCard.Body>
    </RBCard>
  );
}

