import { basePath } from "@/lib/paths";

export function BrandLogo({ className, eager = false }: { className?: string; eager?: boolean }) {
  return (
    <img
      src={`${basePath}/brand/labbys-logo.png`}
      alt="LabbyS — Labs Built by Sendil"
      className={className}
      width={1024}
      height={538}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}
