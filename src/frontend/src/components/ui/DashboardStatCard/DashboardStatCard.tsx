import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import styles from "./DashboardStatCard.module.css";

type Props = {
  icon: IconName;
  value: string | number;
  label: string;
  hint?: string;
  href?: string;
};

export function DashboardStatCard({ icon, value, label, hint, href }: Props) {
  const content = <>
    <span className={styles.header}>
      <strong className={styles.number}>{value}</strong>
      {href && <Icon name="arrow" size={16} className={styles.direction} />}
    </span>
    <span className={styles.caption}>{label}</span>
    <span className={styles.footer}>
      {hint && <small className={styles.hint}>{hint}</small>}
      <span className={styles.symbol}><Icon name={icon} size={27} /></span>
    </span>
  </>;

  return href
    ? <Link href={href} className={styles.surface}>{content}</Link>
    : <div className={styles.surface}>{content}</div>;
}
