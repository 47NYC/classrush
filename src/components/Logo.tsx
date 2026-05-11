import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="size-9 bg-primary rounded-xl rotate-3 flex items-center justify-center shadow-soft">
        <div className="size-4 bg-primary-foreground rounded-sm" />
      </div>
      <span className="font-display text-xl font-bold tracking-tight text-foreground">
        Class<span className="text-primary">Rush</span>
      </span>
    </Link>
  );
}
