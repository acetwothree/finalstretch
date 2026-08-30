import { cn } from "@/lib/utils";

export function GlowCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 bg-obsidian-soft/70 backdrop-blur-sm",
        "shadow-[0_0_0_1px_rgb(255_255_255/0.02),0_20px_60px_-20px_rgb(0_0_0/0.7)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
