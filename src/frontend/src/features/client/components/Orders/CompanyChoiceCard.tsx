import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { ActionButton } from "@/components/ui/Workspace/Workspace";
import type { Company } from "../../types/client";
import styles from "./CompanyChoiceCard.module.css";

export function CompanyChoiceCard({ company, onSelect }: { company: Company; onSelect: () => void }) {
  const delivered = company.deliveredShipmentsCount;

  return <article className={styles.card}>
    <div className={styles.media}>
      <div className={styles.mediaContent}>
        <div className={styles.portrait}>
          <div className={styles.portraitInner}>
            {company.photoUrl
              ? <Image src={company.photoUrl} alt={`Fotografía de ${company.businessName}`} fill sizes="104px" unoptimized />
              : <Icon name="building" size={34} />}
          </div>
        </div>
        {!company.photoUrl && <span className={styles.placeholderLabel}>TravelDLS</span>}
      </div>
    </div>
    <div className={styles.body}>
      <span className={styles.eyebrow}>EMPRESA DE TRANSPORTE</span>
      <h3>{company.businessName}</h3>
      <p className={styles.identifier}>{company.ruc ? `RUC ${company.ruc}` : "Sin RUC publicado"}</p>
      <div className={styles.history}><Icon name="truck" size={18} />
        <span>{typeof delivered === "number"
          ? delivered === 0 ? "Aún sin envíos entregados" : <><strong>{delivered.toLocaleString("es-NI")}</strong> {delivered === 1 ? "envío entregado" : "envíos entregados"}</>
          : "Historial de envíos no disponible"}</span>
      </div>
      <div className={styles.cta}><ActionButton variant="primary" icon="arrow" iconPlacement="after" fullWidth onClick={onSelect}>Solicitar transporte</ActionButton></div>
    </div>
  </article>;
}
