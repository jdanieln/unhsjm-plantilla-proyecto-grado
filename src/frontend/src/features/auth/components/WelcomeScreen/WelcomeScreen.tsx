import Image from "next/image";
import { ThemeToggle } from "@/components/ui/ThemeToggle/ThemeToggle";
import { Icon } from "@/components/ui/Icon/Icon";
import { AuthPanel } from "@/features/auth/components/AuthPanel/AuthPanel";
import styles from "./WelcomeScreen.module.css";

export function WelcomeScreen() {
  return (
    <div className={styles.screen}>
      <a className={styles.skipLink} href="#access">
        Ir al acceso
      </a>
      <header className={styles.header}>
        <Image
          className={styles.logo}
          src="/images/traveldls-logo.png"
          alt="TravelDLS. Tu pedido, bajo nuestra mirada."
          width={200}
          height={99}
          preload
        />
        <div className={styles.headerActions}>
        <span className={styles.headerNote}>
          <span />
          Conectamos tu próximo destino
        </span>
        <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.story} aria-labelledby="welcome-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <span /> LOGÍSTICA QUE TE CONECTA
            </p>
            <h1 id="welcome-title">
              Tu carga y tu empresa.
              <br />
              <span>Nuestro compromiso.</span>
            </h1>
            <p className={styles.description}>
              Cada envío es un nuevo destino. Solicita el transporte ideal para
              tu pedido o registra tu empresa y gestiona vehículos, conductores
              y recursos en un solo lugar.
            </p>
          </div>

          <div className={styles.truckScene}>
            <div className={styles.orbit} aria-hidden="true" />
            <div className={styles.road} aria-hidden="true" />
            <Image
              className={styles.truck}
              src="/images/purple-truck.png"
              alt="Camión de carga TravelDLS en tonos morados y azul oscuro"
              width={1280}
              height={1280}
              sizes="(max-width: 900px) 90vw, 55vw"
              preload
            />
            <div className={styles.truckLabel}>
              <span className={styles.labelIcon}>
                <Icon name="box" size={19} />
              </span>
              <span>
                De principio a destino.
                <small>Tu pedido, bajo nuestra mirada.</small>
              </span>
            </div>
            <span className={styles.sceneCaption}>
              EL CAMINO LO HACEMOS JUNTOS
            </span>
          </div>

          <ul className={styles.benefits} aria-label="Conoce TravelDLS">
            <li>
              <Icon name="box" />
              <h2>Todo en un lugar</h2>
              <p>Tus pedidos, organizados.</p>
            </li>
            <li>
              <Icon name="route" />
              <h2>Más conectados</h2>
              <p>Acercamos cada destino.</p>
            </li>
            <li>
              <Icon name="shield" />
              <h2>Contigo en el camino</h2>
              <p>El control en tus manos.</p>
            </li>
          </ul>
        </section>

        <section
          className={styles.access}
          id="access"
          aria-label="Accede a TravelDLS"
          tabIndex={-1}
        >
          <div className={styles.accessGlow} aria-hidden="true" />
          <AuthPanel />
          <p className={styles.accessNote}>
            <span /> Un nuevo camino comienza con una conexión.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} TravelDLS. Todos los derechos reservados.
        </span>
        <span>Movemos cargas. Conectamos destinos.</span>
      </footer>
    </div>
  );
}
