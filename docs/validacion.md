# Validación de 0.1.0

Comprobaciones del 5 de septiembre de 2026, sobre esta distribución independiente:

| Comprobación | Resultado y alcance |
|---|---|
| Dependencias | Instalación aislada desde npm; lockfile portable, sin enlaces a rutas del equipo original |
| Build | 86 módulos; aplicación sin configuración de producción ni fuentes externas automáticas |
| Tests | 52 casos: 6 de interacción científica, 9 de herramientas científicas, 17 de recuperación, 5 de integración independiente, 5 de exportaciones y saneado, 5 de edición en el lienzo y 5 de gráficas y tablas |
| Ejemplos | 12 proyectos, 72 diapositivas; validación JSON, render DOM de cada diapositiva, ausencia de errores KaTeX y generación Beamer |
| Guardado | Conservar una presentación con nombre al abrir otro ejemplo; navegación y enlace directo de ejemplo |
| PowerPoint | Generado un archivo con texto, tabla y notas; integridad ZIP, XML parseable y contenido conservado. Una prueba automática arma el paquete con una rama activa y comprueba CRC, partes declaradas y referencias |
| RDKit real | RDKit 2025.03.4 analizó etanol, SMILES CCO; masa monoisotópica calculada 46.04186 |
| Inspección visual | Capturas Firefox: inicio, editor, química, presentación y móvil de 390 × 844 |
| Privacidad del build | Sin endpoints de producción, SDK de Supabase o fuentes Google automáticas |

Los tests de DOM usan JSDOM y almacenamiento aislado; no prueban medidas de pantalla reales, y JSDOM no implementa `innerText`, así que el guardado del texto tecleado se comprueba en navegador y no en la suite. Las capturas complementan esa limitación. No se ha verificado visualmente el PPTX en Microsoft PowerPoint, ni compilado los ejemplos TEX con una distribución LaTeX. La comprobación real de RDKit no equivale a validar todas sus operaciones ni las herramientas 3D.

`npm test` ejecuta los siete archivos de pruebas. Algunas versiones de Node muestran siete grupos en el resumen; ejecutando cada archivo directamente se muestran sus 52 casos. No se atribuye a esta distribución el resultado histórico de pruebas de la suite completa.
