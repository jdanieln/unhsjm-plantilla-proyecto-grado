import { Children, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import styles from "./DetailCard.module.css";

export type DetailFact = {
  label: string;
  value: ReactNode;
  icon?: IconName;
  wide?: boolean;
};

type Props = {
  title: string;
  eyebrow?: string;
  icon?: IconName;
  amount?: ReactNode;
  amountLabel?: string;
  facts: DetailFact[];
  children?: ReactNode;
};

export function DetailCard({ title, eyebrow, icon = "box", amount, amountLabel = "Monto", facts, children }: Props) {
  const actions = Children.toArray(children);
  return <article className={styles.card}>
    <header className={styles.header}>
      <div className={styles.identity}>
        <span className={styles.icon}><Icon name={icon} size={22} /></span>
        <div className={styles.titleGroup}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h4>{title}</h4>
        </div>
      </div>
      {amount != null && <div className={styles.amount}><span>{amountLabel}</span><strong>{amount}</strong></div>}
    </header>
    {facts.length > 0 && <dl className={styles.facts}>
      {facts.map((fact, index) => <div key={`${fact.label}-${index}`} className={fact.wide ? styles.wide : undefined}>
        <dt>{fact.icon && <Icon name={fact.icon} size={15} />}{fact.label}</dt>
        <dd>{fact.value}</dd>
      </div>)}
    </dl>}
    {actions.length > 0 && <div className={styles.actions}>{actions}</div>}
  </article>;
}
