import Image from "next/image";
import styles from "./Mia.module.css";

// Mia, the AI tutor's persona. Small spots always use the same round portrait so she's recognisable; larger spots use
// a pose that matches what she's doing. Pass alt="" where her name is already next to the image.

export type MiaPose = "friendly" | "thinking" | "reviewing" | "welcoming" | "confident";

/** Pixel size of each pose file in /public/mia. */
const POSES: Record<MiaPose, [number, number]> = {
  friendly: [308, 440], thinking: [346, 440], reviewing: [375, 440], welcoming: [448, 440], confident: [381, 640],
};

/** The round head-and-shoulders portrait with a mint ring. */
export function Mia({ size, alt = "", className = "" }: { size: number; alt?: string; className?: string }) {
  return <Image src="/mia/avatar.webp" alt={alt} width={size} height={size} className={`${styles.avatar} ${className}`} style={{ width: size, height: size }} />;
}

/** Mia pondering with a pulsing thought bubble, shown while she writes. */
export function MiaThinking({ height, className = "" }: { height: number; className?: string }) {
  return (
    <span className={`${styles.thinking} ${className}`} role="img" aria-label="Mia is thinking">
      <MiaPose pose="thinking" height={height} priority />
      <span className={styles.bubble} aria-hidden="true"><span /><span /><span /></span>
    </span>
  );
}

/** A transparent cut-out of Mia in one of her poses, sized by height. */
export function MiaPose({ pose, height, alt = "", className = "", priority }: { pose: MiaPose; height: number; alt?: string; className?: string; priority?: boolean }) {
  const [w, h] = POSES[pose];
  const width = Math.round((w / h) * height);
  return <Image src={`/mia/${pose}.webp`} alt={alt} width={width} height={height} priority={priority} className={`${styles.pose} ${className}`} style={{ height, width }} />;
}
