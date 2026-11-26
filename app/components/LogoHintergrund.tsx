// Logo als feststehender Hintergrund (bleibt beim Scrollen stehen). Deckkraft hier einstellen: 0.4 = 40 %.
// Verwendung: <LogoHintergrund /> als erstes Element in einem Container mit position: relative.
export const LOGO_DECKKRAFT = 0.4;

export default function LogoHintergrund({ deckkraft = LOGO_DECKKRAFT }: { deckkraft?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 60, // unterhalb der Navigationsleiste
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: "url(/vikingfly-logo.webp)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "contain", // ganzes Logo, so gross wie der sichtbare Bereich zulässt
        opacity: deckkraft,
      }}
    />
  );
}
