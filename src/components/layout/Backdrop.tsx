const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/**
 * The atmosphere behind every page: slow drifting mist, a faint crimson and
 * gold glow, film grain and a vignette.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-1/3 -left-1/4 h-[80vmax] w-[80vmax] animate-drift-a rounded-full bg-[radial-gradient(closest-side,rgb(217_215_212/0.07),transparent)] blur-3xl" />
      <div className="absolute -right-1/4 -bottom-1/3 h-[70vmax] w-[70vmax] animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(200_16_46/0.09),transparent)] blur-3xl" />
      <div className="absolute top-1/4 left-1/3 h-[50vmax] w-[50vmax] animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(201_164_92/0.045),transparent)] blur-3xl" />
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--vignette))]" />
    </div>
  );
}
