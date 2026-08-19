import { useRef, useState, type PointerEvent } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

const PAPER = "#FDF6E2";

const ITEMS = [
  {
    id: "admin",
    label: "Administrar o ministério",
    top: "34.6%",
    height: "9.2%",
  },
  {
    id: "org",
    label: "Organizar as programações",
    top: "50.6%",
    height: "10.2%",
  },
  {
    id: "apoio",
    label: "Apoiar os jovens da IBF",
    top: "68.2%",
    height: "10.4%",
  },
] as const;

export function HomeMascot() {
  const reduced = useReducedMotion();
  const boardRef = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState([true, true, true]);
  const rotateX = useSpring(0, { stiffness: 180, damping: 18, mass: 0.6 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 18, mass: 0.6 });

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
    boardRef.current?.style.setProperty("--gx", "50%");
    boardRef.current?.style.setProperty("--gy", "35%");
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType === "touch") return;
    const board = boardRef.current;
    if (!board) return;
    const box = board.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    rotateY.set((px - 0.5) * 16);
    rotateX.set((0.5 - py) * 12);
    board.style.setProperty("--gx", `${px * 100}%`);
    board.style.setProperty("--gy", `${py * 100}%`);
  }

  function toggle(index: number) {
    setChecked((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  return (
    <aside className="relative flex flex-col items-center justify-center gap-6 px-2 py-4 lg:min-h-[min(36rem,calc(100svh-7rem))]">
      <motion.div
        ref={boardRef}
        className="relative cursor-pointer [transform-style:preserve-3d]"
        style={
          reduced
            ? undefined
            : { rotateX, rotateY, transformPerspective: 900, transformOrigin: "center" }
        }
        whileTap={reduced ? undefined : { scale: 0.98 }}
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
      >
        <span
          aria-hidden
          className="absolute bottom-2 left-1/2 h-3 w-[55%] -translate-x-1/2 rounded-full bg-foreground/20 blur-[4px]"
        />

        <img
          src="/logo-prancheta-lg.png"
          alt="Prancheta do Ministério Apoio"
          width={667}
          height={800}
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className="relative h-56 w-auto select-none drop-shadow-sm sm:h-72 lg:h-[22rem] xl:h-[26rem]"
        />

        {!reduced && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at var(--gx, 50%) var(--gy, 35%), rgba(255,255,255,0.55), transparent 42%)",
              maskImage: "url('/logo-prancheta-lg.png')",
              WebkitMaskImage: "url('/logo-prancheta-lg.png')",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              mixBlendMode: "soft-light",
            }}
          />
        )}

        {ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={checked[index]}
            aria-label={item.label}
            className="absolute left-[22%] z-10 w-[58%] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            style={{ top: item.top, height: item.height }}
            onClick={() => toggle(index)}
          >
            {!checked[index] && (
              <span
                aria-hidden
                className="absolute top-1/2 left-[1%] flex h-[90%] w-[29%] -translate-y-1/2 items-center justify-center rounded-[22%]"
                style={{ background: PAPER }}
              >
                <span className="block size-[78%] rounded-[20%] border-[2.5px] border-[#1A120C] sm:border-[3px]" />
              </span>
            )}
          </button>
        ))}
      </motion.div>

      <div className="max-w-md space-y-2 text-center">
        <p className="font-display text-xl font-semibold tracking-tight">Ministério Apoio</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Auxilia na administração e organização do Ministério Apoio dos Jovens da Igreja Batista
          Fonte.
        </p>
        <p className="pt-1 text-xs text-muted-foreground/80">Autor: Rafael de Souza Baptista</p>
      </div>
    </aside>
  );
}

export default HomeMascot;
