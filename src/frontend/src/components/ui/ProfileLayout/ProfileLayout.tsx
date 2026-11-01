import type { ReactNode } from "react";
import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import styles from "./ProfileLayout.module.css";

export function ProfileLayout({ name, email, role, photoUrl, prompt, heading, description, icon = "shield", children }: {
  name: string; email: string; role: string; photoUrl?: string | null; prompt?: string;
  heading: string; description: string; icon?: IconName; children: ReactNode;
}) {
  return <div className={styles.layout}>
    <aside className={`${ui.card} ${styles.identity}`}>
      <div className={styles.photo}>{photoUrl ? <Image src={photoUrl} alt="Foto del perfil" width={110} height={110} unoptimized /> : <Icon name="user" size={40} />}</div>
      <h2>{name}</h2><p>{email}</p><span className={styles.role}>{role}</span>
      {prompt && <p className={styles.prompt}>{prompt}</p>}
    </aside>
    <section className={`${ui.card} ${ui.cardPad}`} aria-labelledby="profile-form-title">
      <div className={styles.formHeading}><div><h2 id="profile-form-title">{heading}</h2><p>{description}</p></div><Icon name={icon} size={23} /></div>
      {children}
    </section>
  </div>;
}

export function ProfileReadOnly({ items }: { items: { label: string; value: string }[] }) {
  return <div className={styles.readonly}>{items.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>;
}
