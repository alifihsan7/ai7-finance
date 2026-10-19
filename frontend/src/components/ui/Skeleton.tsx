import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-obsidian-border/50 ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`p-4 sm:p-5 rounded-xl bg-obsidian-card border border-obsidian-border ${className}`}>
      {children}
    </div>
  );
}
