import React from "react";
import { COLORS } from "../../styles/tokens.js";

export function Card({ children, className = "", style, ...rest }) {
  return (
    <div
      className={`surface-card rounded-lg border ${className}`}
      style={{ borderColor: COLORS.line, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
