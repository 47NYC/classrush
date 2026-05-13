import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/classrush-logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img src={logoSrc} alt="ClassRush" className="h-9 w-auto object-contain" />
      <span className="font-display text-xl font-bold tracking-tight text-foreground">
        Class<span className="text-primary">Rush</span>
      </span>
    </Link>
  );
}
