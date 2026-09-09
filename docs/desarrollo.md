# Desarrollo

Node.js >= 22. Dependencias fijadas en `package-lock.json`. Ejecuta `npm ci`, `npm run build`, `npm test` y `npm start`.

## Estructura

- `src/js/_orden.txt`: orden explícito de los módulos del editor; comparten un ámbito léxico.
- `src/css/_orden.txt`: estilos en orden, incluidos los del espacio inicial.
- `src/js/47-lab-catalogo.js`, `src/js/47b-lab.js` y `src/js/48-lab-edit.js`: el montaje de laboratorio, partido en catálogo, motor y editor (ver «Editores de figura»).
- `src/js/87-ejemplos.js`: doce ejemplos científicos construidos con los bloques reales.
- `src/js/88-workspace.js`: biblioteca, plantillas y recursos locales.
- `src/js/88a-suite.js`: navegación de la aplicación independiente; el nombre conserva su procedencia histórica.
- `src/js/88b-recuperacion.js`: historial en IndexedDB, separado del autoguardado.
- `src/js/88c-ciencia-libre.js`: carga local de bibliotecas científicas.
- `web/quimica-worker.js`: trabajo RDKit fuera del hilo de la interfaz.
- `herramientas/build.mjs`: HTML, recursos locales y manifiestos; no lee credenciales ni configuración de nube.
- `herramientas/examples.mjs`: regenera los JSON y TEX documentados después de construir.
- `tests/`: interacción científica, recuperación y pruebas de la aplicación construida.

Los nombres históricos internos no implican que la suite completa esté incluida. Esta distribución contiene Presentaciones. Evita introducir dependencias a sus otros editores.

## Contratos a preservar

Conserva el formato JSON v1 y las claves `erlen-slides.*`. No migres ni sobrescribas automáticamente archivos de Erlen. Vacía la edición pendiente antes de guardar o insertar; los diálogos asíncronos deben comprobar que sigue abierto el mismo documento. Un error de cuota debe ser visible y conservar el original.

La fuente del código es accesible desde la interfaz. Un despliegue derivado debe apuntar al código de esa versión: modifica `ERLEN_SOURCE_URL` cuando corresponda. Las licencias de terceros están en `licenses/`; las bibliotecas opcionales se cargan desde rutas relativas, compatibles con un subdirectorio.

## Comprobar un cambio

1. Ejecuta build y los tests afectados.
2. Si cambias ejemplos, ejecuta `npm run examples` y revisa los archivos generados.
3. Comprueba visualmente escritorio y móvil cuando cambie el diseño.
4. Si modificas un exportador, inspecciona el archivo exportado, no solo su nombre o extensión.

Los tests JSDOM no verifican medidas reales ni rasterización. La estructura actual concatena módulos: es una base funcional heredada, no una promesa de arquitectura modular aislada.

## Editores de figura

Varios editores del programa —el montaje de laboratorio, las estructuras químicas, los diagramas— no son código de una charla: dibujan una figura. El montaje es el primero que se separa en tres piezas con una frontera declarada, y sirve de patrón para los demás:

- **catálogo** (`47-lab-catalogo.js`): solo datos. Cada pieza es una lista de figuras `{t:'p'|'l'|'c'|'r'|'e'}` en una caja de 100 × 140. No ejecuta nada ni conoce el resto del programa.
- **motor** (`47b-lab.js`): recibe un montaje saneado y los colores de quien dibuja, y devuelve un dibujo. No consulta el DOM ni `S.deck` salvo por el tema. Aquí vive `PINTURA_LAB`, la tabla que dice cómo se pinta cada papel en cada estilo.
- **editor** (`48-lab-edit.js`): la interfaz de colocar, rotular y unir, más la traducción a TikZ para el PDF.

La regla que sostiene la frontera: **las dos salidas leen la misma tabla**. La de pantalla la resuelve con opacidad y la del PDF mezclando con el fondo, pero los números salen de una sola celda. Cuando cada una tenía su copia, la sombra, el líquido, el metal y las líneas finas ya habían divergido entre lo que se veía y lo que se imprimía. `tests/lab.test.mjs` comprueba esa correspondencia papel por papel y estilo por estilo.
