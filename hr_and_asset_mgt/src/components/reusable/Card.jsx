import { Card as RBCard } from "react-bootstrap";
import "../../style/layout.css";

export default function Card({ title, subtitle, children, className = "", luxury = false, ...props }) {
  return (
    <RBCard className={`card-container ${className} ${luxury ? 'luxury-card' : ''}`} {...props}>
      {luxury && <div className="luxury-glow" />}

      {(title || subtitle) && (
        <RBCard.Header className="card-header">
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </RBCard.Header>
      )}
      <RBCard.Body className="card-body">{children}</RBCard.Body>
    </RBCard>
  );
}
