import happy from "@/assets/mascot/happy.png";
import excited from "@/assets/mascot/excited.png";
import focused from "@/assets/mascot/focused.png";
import surprised from "@/assets/mascot/surprised.png";
import smart from "@/assets/mascot/smart.png";
import victory from "@/assets/mascot/use-victory.png";
import loading from "@/assets/mascot/use-loading.png";
import notification from "@/assets/mascot/use-notification.png";
import appIcon from "@/assets/mascot/use-app-icon.png";

export type MascotMood =
  | "happy" | "excited" | "focused" | "surprised" | "smart"
  | "victory" | "loading" | "notification" | "app-icon";

const sources: Record<MascotMood, string> = {
  happy, excited, focused, surprised, smart,
  victory, loading, notification,
  "app-icon": appIcon,
};

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  alt?: string;
}

/** Réutilise la mascotte ClassRush. Mood par défaut: happy. */
export function Mascot({ mood = "happy", className = "", alt = "ClassRush" }: MascotProps) {
  return (
    <img
      src={sources[mood]}
      alt={alt}
      className={`object-contain select-none pointer-events-none ${className}`}
      draggable={false}
    />
  );
}
