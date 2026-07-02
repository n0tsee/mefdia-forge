import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl2 border border-base-700 bg-base-850 shadow-card ${className}`}
      {...props}
    />
  );
}
