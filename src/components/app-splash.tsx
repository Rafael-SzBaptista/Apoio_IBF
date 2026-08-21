import { AppLogo } from "@/components/app-logo";

export function AppSplash() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando o ministério"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#1A120C]"
    >
      <AppLogo
        alt="Ministério Apoio"
        variant="white"
        width={160}
        height={192}
        fetchPriority="high"
        className="h-28 w-auto sm:h-32"
      />
    </div>
  );
}
