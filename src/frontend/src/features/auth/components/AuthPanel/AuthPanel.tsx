"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { SessionTransition } from "@/components/ui/SessionTransition/SessionTransition";
import { waitForSessionTransition } from "@/components/ui/SessionTransition/sessionTransitionTiming";
import {
  AuthRequestError,
  login,
  signup,
} from "@/features/auth/services/authService";
import type { SessionUser } from "@/features/auth/types/auth";
import {
  getRoleDestination,
  getRoleLabel,
} from "@/features/auth/utils/roleNavigation";
import styles from "./AuthPanel.module.css";

type AuthMode = "login" | "register";
type FormNotice = {
  tone: "error" | "success";
  message: string;
};

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const isRegistering = mode === "register";

  function changeMode(nextMode: AuthMode) {
    if (isSubmitting) return;
    setMode(nextMode);
    setShowPassword(false);
    setNotice(null);
  }

  function finishAuthentication(user: SessionUser): boolean {
    const roleLabel = getRoleLabel(user.role);
    const destination = getRoleDestination(user.role);

    setNotice({
      tone: "success",
      message: isRegistering
        ? `Cuenta de cliente creada correctamente. Bienvenido, ${user.name}.`
        : `Sesión iniciada correctamente como ${roleLabel}.`,
    });

    if (!destination) return false;

    window.location.assign(destination);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    setNotice(null);
    const transitionStartedAt = isRegistering ? null : Date.now();

    let navigationStarted = false;

    try {
      const user = isRegistering
        ? await signup({
            name: String(formData.get("fullName") ?? "").trim(),
            email,
            password,
          })
        : await login({ email, password });

      if (transitionStartedAt !== null) {
        await waitForSessionTransition(transitionStartedAt);
      }
      navigationStarted = finishAuthentication(user);
    } catch (error) {
      if (transitionStartedAt !== null) {
        await waitForSessionTransition(transitionStartedAt);
      }
      setNotice({
        tone: "error",
        message:
          error instanceof AuthRequestError
            ? error.message
            : "No fue posible completar la solicitud. Inténtalo nuevamente.",
      });
    } finally {
      // Keep the transition visible until the destination replaces this page.
      if (!navigationStarted) setIsSubmitting(false);
    }
  }

  return (
    <>
      <SessionTransition
        active={isSubmitting && !isRegistering}
        mode="login"
      />
      <div className={styles.panel}>
      <div className={styles.welcomeIcon}>
        <Image
          className={styles.welcomeLogo}
          src="/images/traveldls-emblem.png"
          alt="Emblema de TravelDLS: camión y velocímetro"
          width={104}
          height={104}
        />
      </div>
      <p className={styles.overline}>TU PRÓXIMO DESTINO EMPIEZA AQUÍ</p>
      <h2>{isRegistering ? "Comienza tu camino" : "Bienvenido de nuevo"}</h2>
      <p className={styles.subtitle}>
        {isRegistering
          ? "Crea tu cuenta de cliente y conecta con nuevas posibilidades."
          : "Qué bueno tenerte aquí. Continuemos el viaje."}
      </p>

      <div
        className={styles.switcher}
        role="group"
        aria-label="Opciones de acceso"
      >
        <button
          type="button"
          aria-pressed={!isRegistering}
          onClick={() => changeMode("login")}
          disabled={isSubmitting}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          aria-pressed={isRegistering}
          onClick={() => changeMode("register")}
          disabled={isSubmitting}
        >
          Crear cuenta
        </button>
      </div>

      <form
        key={mode}
        onSubmit={handleSubmit}
        className={styles.form}
        aria-busy={isSubmitting}
      >
        {isRegistering && (
          <div className={styles.field}>
            <label htmlFor="full-name">Nombre completo</label>
            <div className={styles.inputWrap}>
              <Icon name="user" size={18} />
              <input
                id="full-name"
                name="fullName"
                autoComplete="name"
                placeholder="¿Cómo te llamas?"
                required
                minLength={2}
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <div className={styles.inputWrap}>
            <Icon name="mail" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
              maxLength={254}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <div className={styles.inputWrap}>
            <Icon name="lock" size={18} />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              placeholder={
                isRegistering ? "Crea una contraseña" : "Ingresa tu contraseña"
              }
              required
              minLength={isRegistering ? 8 : undefined}
              aria-describedby={isRegistering ? "password-hint" : undefined}
              disabled={isSubmitting}
            />
            <button
              className={styles.passwordToggle}
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
            </button>
          </div>
          {isRegistering && (
            <small id="password-hint" className={styles.hint}>
              Utiliza al menos 8 caracteres.
            </small>
          )}
        </div>

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isRegistering
              ? "Creando cuenta..."
              : "Iniciando sesión..."
            : isRegistering
              ? "Crear mi cuenta"
              : "Iniciar sesión"}
          <Icon name="arrow" size={18} />
        </button>
        <p
          className={styles.notice}
          data-tone={notice?.tone}
          role={notice?.tone === "error" ? "alert" : "status"}
        >
          {notice?.message}
        </p>
      </form>

      <div className={styles.divider}>
        <span>
          {isRegistering
            ? "¿Ya eres parte de TravelDLS?"
            : "¿Es tu primera vez por aquí?"}
        </span>
      </div>
      <button
        className={styles.secondary}
        type="button"
        onClick={() => changeMode(isRegistering ? "login" : "register")}
        disabled={isSubmitting}
      >
        {isRegistering ? "Volver a iniciar sesión" : "Únete a TravelDLS"}
        <Icon name="arrow" size={16} />
      </button>
      <div className={styles.cardFooter}>
        <Icon name="box" size={14} />
        <span>Tu pedido, bajo nuestra mirada.</span>
      </div>

      <div className={styles.supportFloating}>
        {showSupport && (
          <section
            id="support-panel"
            className={styles.supportPanel}
            aria-labelledby="support-title"
          >
            <div className={styles.supportHeader}>
              <Icon name="help" size={19} />
              <h2 id="support-title">Contactar con soporte</h2>
            </div>

            <div className={styles.supportSection}>
              <h3>Cuenta de cliente</h3>
              <p>
                Crea tu cuenta para solicitar envíos, cotizar servicios y dar
                seguimiento a tus pedidos.
              </p>
            </div>

            <div className={styles.supportSection}>
              <h3>Cuenta de empresa</h3>
              <p>
                El registro público crea cuentas de cliente. Para solicitar una
                cuenta de empresa, contacta a un superadmin con los datos de tu
                empresa y de la persona responsable.
              </p>
            </div>

            <div className={styles.supportSection}>
              <h3>Cuenta de conductor</h3>
              <p>
                Los conductores no deben registrarse por su cuenta. Una empresa
                o un superadmin crea o vincula su acceso.
              </p>
            </div>

            <div className={styles.supportContact}>
              <span>Contacta a un superadmin</span>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=Jarethsaidbonillac@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                Jarethsaidbonillac@gmail.com
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=elsacerdaugarte@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                elsacerdaugarte@gmail.com
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=Ashleycastro@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                Ashleycastro@gmail.com
              </a>
            </div>
          </section>
        )}

        {!showSupport && (
          <div className={styles.supportPrompt}>
            <strong>¿Eres empresa o conductor?</strong>
            <span>Contacta con un superadmin</span>
          </div>
        )}

        <button
          className={styles.supportButton}
          type="button"
          onClick={() => setShowSupport(!showSupport)}
          aria-expanded={showSupport}
          aria-controls="support-panel"
          aria-label={
            showSupport ? "Cerrar contacto con soporte" : "Contactar con soporte"
          }
          title="Contactar con soporte"
        >
          <Icon name={showSupport ? "close" : "help"} size={22} />
        </button>
      </div>
      </div>
    </>
  );
}
