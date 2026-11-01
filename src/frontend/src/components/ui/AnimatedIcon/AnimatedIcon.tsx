import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import styles from "./AnimatedIcon.module.css";

export function AnimatedIcon({ name, size = 24, motion = "float" }: {
  name: IconName;
  size?: number;
  motion?: "float" | "hover" | "nav";
}) {
  const className = motion === "float" ? styles.float : motion === "nav" ? styles.nav : styles.hover;
  return <Icon name={name} size={size} className={className} />;
}
