# TravelDLS - Proyecto de Grado

Este repositorio contiene el desarrollo del sistema **TravelDLS**, junto con la documentación técnica y el informe académico del proyecto de grado de la carrera de **Ingeniería en Sistemas de Información** de la **Universidad Nacional Héroes San José de las Mulas (UNHSJM)**.

La estructura mantiene separadas las responsabilidades del sistema, la documentación técnica y el informe académico final.

---

## 📁 Estructura del Repositorio

```text
TravelDLS-proyecto-grado/
├── .github/
│   └── ISSUE_TEMPLATE/       # Plantillas para la gestión de tareas e incidencias
├── .vscode/                   # Configuración recomendada para Visual Studio Code
├── docs/                     # Documentación técnica y artefactos de diseño
│   ├── actas-reuniones/      # Minutas y registros de seguimiento con tutores
│   ├── diagramas/            # Diagramas de arquitectura, UML, entidad-relación, etc.
│   └── mockups/              # Prototipos y diseños de interfaz de usuario
├── informe-latex/            # Documento del informe final redactado en LaTeX (APA 7)
│   ├── anexos/               # Documentos complementarios y tablas extensas
│   ├── capitulos/            # Capítulos divididos en archivos .tex individuales
│   ├── figuras/              # Ilustraciones, diagramas e imágenes del informe
│   ├── main.tex              # Archivo principal de compilación y configuración
│   ├── referencias.bib       # Archivo de fuentes bibliográficas (BibLaTeX)
│   └── unhsjm-formato.sty    # Paquete de estilos y formato institucional de la UNHSJM
├── src/                      # Código fuente del sistema
│   ├── backend/              # API y lógica del servidor desarrollada con AdonisJS
│   │   ├── app/              # Controladores, modelos, servicios, validadores y middleware
│   │   ├── config/           # Configuración de la aplicación
│   │   ├── database/         # Migraciones y seeders
│   │   ├── start/             # Rutas y arranque del servidor
│   │   ├── tests/             # Pruebas automatizadas
│   │   ├── package.json       # Dependencias y scripts del backend
│   │   ├── adonisrc.ts        # Configuración de AdonisJS
│   │   └── .env.example       # Variables de entorno de referencia
│   ├── frontend/             # Aplicación web con Next.js, App Router y TypeScript
│   └── README.md              # Guía adicional sobre el código fuente
├── output/                   # Archivos generados durante el desarrollo
├── tmp/                      # Archivos temporales locales
├── .gitignore                # Exclusión de archivos temporales y basura de desarrollo
├── LICENSE                   # Licencia del proyecto
└── README.md                 # Guía general del repositorio
```

---

## ⚙️ Backend

El backend se encuentra en `src/backend/` y está desarrollado con **AdonisJS**, **TypeScript** y **PostgreSQL**. Esta carpeta funciona como la raíz de la aplicación AdonisJS, por lo que los comandos deben ejecutarse desde allí.

### Instalación de dependencias

```bash
cd src/backend
pnpm install
```

### Comandos principales

```bash
pnpm dev          # Inicia el servidor en modo desarrollo
pnpm typecheck    # Comprueba los tipos de TypeScript
pnpm test         # Ejecuta las pruebas
pnpm build        # Genera la compilación de producción
```

Las variables de entorno deben configurarse a partir de `src/backend/.env.example`. El archivo `.env` local no debe subirse al repositorio.

---

## Frontend

La aplicación web está en `src/frontend/`. Para iniciar la página de bienvenida:

```bash
cd src/frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abre http://localhost:3000. La [guía del frontend](src/frontend/README.md) describe la estructura, las convenciones y los comandos de validación.

---

## 📄 Compilación del Informe en LaTeX (Normas APA 7)

El informe académico final se encuentra en la carpeta `informe-latex/` y cumple con las especificaciones del estándar APA 7 (estilo institucional en español) utilizando `biblatex` con motor `biber`.

### 🎨 Configuración de la Portada Institucional

La plantilla incluye un paquete de formato institucional (`unhsjm-formato.sty`) que genera automáticamente una portada académica estandarizada con soporte para:
- **Logo Institucional:** Centrado en la parte superior (ubicado en `figuras/logo-unhsjm.jpeg`).
- **Modalidades de Culminación de Estudios:** Configurable para `PROYECTO DE GRADO` o `MONOGRAFÍA`.
- **Trabajos Grupales o Individuales:** Múltiples autores/estudiantes con carnet/ID.
- **Tutor / Asesor, Ubicación y Fecha.**

Ejemplo de configuración en `main.tex`:
```latex
\unhsjmlogo{figuras/logo-unhsjm.jpeg}
\modalidad{PROYECTO DE GRADO} % O 'MONOGRAFÍA'

\title{Título del Trabajo}
\subtitulo{Subtítulo opcional}

\autores{
  Estudiante 1 (Carnet: 2022-0001U) \\
  Estudiante 2 (Carnet: 2022-0002U)
}
\tutor{Ing. Nombre del Tutor / Asesor, M.Sc.}
\ciudad{Managua, Nicaragua}
\fecha{Agosto, 2026}
```

### 1. Compilación con TeXstudio (Recomendado)

Para una experiencia de trabajo local óptima y estructurada:

1. **Instalar una Distribución de LaTeX:**
   - **Windows:** [MiKTeX](https://miktex.org/) o [TeX Live](https://www.tug.org/texlive/).
   - **macOS:** [MacTeX](https://www.tug.org/mactex/).
   - **Linux:** TeX Live (`sudo apt install texlive-full`).
2. **Instalar TeXstudio:** Descargue e instale el entorno de desarrollo desde [texstudio.org](https://www.texstudio.org/).
3. **Configurar el Motor de Bibliografía (Biber):**
   - En TeXstudio, vaya a **Opciones** -> **Configurar TeXstudio** -> **Construcción** (*Build*).
   - En la opción **Herramienta Bibliográfica por Defecto** (*Default Bibliography Tool*), asegúrese de seleccionar **Biber**.
4. **Abrir y Compilar:**
   - Abra el archivo `informe-latex/main.tex` en TeXstudio.
   - Presione **F5** (o la opción *Construir y Ver*) para compilar y visualizar el PDF resultante.

---

### 2. Compilación por Línea de Comandos (CLI)

Si prefiere compilar manualmente desde una terminal con una distribución de LaTeX instalada:

```bash
cd informe-latex
pdflatex main.tex
biber main
pdflatex main.tex
pdflatex main.tex
```

O utilice la herramienta `latexmk` para automatizar la secuencia de compilación:

```bash
cd informe-latex
latexmk -pdf -bibtex main.tex
```
