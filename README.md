# Plantilla de Proyecto de Grado - Ingeniería en Sistemas (UNHSJM)

Este repositorio constituye la plantilla estandarizada para el desarrollo de los Proyectos de Grado de la carrera de **Ingeniería en Sistemas de Información** de la **Universidad Nacional Hermanos San Juan María (UNHSJM)**.

Su estructura está diseñada para mantener una clara separación de responsabilidades entre el desarrollo del código fuente (`src/`), la documentación técnica del proyecto (`docs/`) y el informe académico escrito final (`informe-latex/`).

---

## 📁 Estructura del Repositorio

```text
unhsjm-plantilla-proyecto-grado/
├── .github/
│   └── ISSUE_TEMPLATE/       # Plantillas para la gestión de tareas e incidencias
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
├── src/                      # Código fuente del sistema desarrollado (libre estructuración)
│   └── README.md             # Guía de estructuración del código fuente
├── .gitignore                # Exclusión de archivos temporales y basura de desarrollo
├── LICENSE                   # Licencia del proyecto
└── README.md                 # Guía general del repositorio
```

---

## 📄 Compilación del Informe en LaTeX (Normas APA 7)

El informe académico final se encuentra en la carpeta `informe-latex/` y cumple con las especificaciones del estándar APA 7 (estilo estudiante/institucional en español) utilizando `biblatex` con motor `biber`.

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
