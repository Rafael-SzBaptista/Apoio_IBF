import { cn } from "@/lib/utils";

type AppLogoProps = {
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "auto" | "sync";
  draggable?: boolean;
  /** auto = escura no claro / branca no escuro; white = sempre branca; light = sempre escura */
  variant?: "auto" | "white" | "light";
};

/** Logo escura no tema claro; versão branca no tema escuro (ou fixa via variant). */
export function AppLogo({
  alt = "Ministério Apoio",
  width = 80,
  height = 96,
  className,
  fetchPriority,
  decoding = "async",
  draggable,
  variant = "auto",
}: AppLogoProps) {
  const lightClass =
    variant === "white"
      ? "hidden"
      : variant === "light"
        ? "h-full w-auto object-contain"
        : "h-full w-auto object-contain dark:hidden";
  const whiteClass =
    variant === "light"
      ? "hidden"
      : variant === "white"
        ? "h-full w-auto object-contain"
        : "hidden h-full w-auto object-contain dark:block";

  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <img
        src="/logo.png"
        alt={variant === "white" ? "" : alt}
        width={width}
        height={height}
        decoding={decoding}
        fetchPriority={fetchPriority}
        draggable={draggable}
        className={lightClass}
        aria-hidden={variant === "white" ? true : undefined}
      />
      <img
        src="/imagem_exata_em_branco.png"
        alt={variant === "white" ? alt : ""}
        width={width}
        height={height}
        decoding={decoding}
        fetchPriority={fetchPriority}
        draggable={draggable}
        className={whiteClass}
        aria-hidden={variant === "white" ? undefined : true}
      />
    </span>
  );
}
