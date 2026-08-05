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

El informe académico final se encuentra en la carpeta [`informe-latex/`](file:///Users/jdnarvaezf/Documents/UNHSJM/Formas%20de%20culminaci%C3%B3n%20de%20estudios/unhsjm-plantilla-proyecto-grado/informe-latex) y cumple con las especificaciones del estándar APA 7 (estilo estudiante/institucional en español) utilizando `biblatex` con motor `biber`.

### 1. Uso en Overleaf (Recomendado)
1. Comprima la carpeta `informe-latex/` en un archivo `.zip`.
2. Inicie sesión en [Overleaf](https://www.overleaf.com/) y cree un nuevo proyecto importando el archivo `.zip`.
3. Verifique en la configuración del proyecto (*Menu* -> *Settings*) que el motor de bibliografía esté configurado en **Biber** (`Biblatex engine: biber`) y el compilador en **pdfLaTeX** o **XeLaTeX**.
4. Defina el archivo `main.tex` como el documento principal de compilación (*Main document*).

### 2. Compilación Local
Si prefiere trabajar en su computadora local, asegúrese de tener instalada una distribución de LaTeX completa (TeX Live, MiKTeX o MacTeX) junto con `biber`.

Desde una terminal, navegue a la carpeta `informe-latex/` y ejecute:

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
