# Notas de la versión 0.2.0

Segunda publicación de **Erlen Slides**, bajo AGPL-3.0-only. Sigue siendo local:
sin cuentas, sin servidor y sin telemetría.

## Escribir en la diapositiva

- El cartel de zona vacía **es** el control que crea el texto: un clic —o Enter,
  porque es enfocable— añade un bloque en *esa* zona y deja el cursor dentro. En
  una cuadrícula 2×2, tres de las cuatro celdas eran inalcanzables con el ratón.
- Una figura seleccionada se arrastra agarrándola y tiene manijas de anchura a
  los dos lados.
- En vertical el lienzo se ciñe a la diapositiva en vez de dejarla flotando: a
  390 × 844 el espacio muerto pasa de unos 320 px a 12, el pie del lienzo cabe en
  una fila y la tira de miniaturas se convierte en una rejilla de dos columnas
  con miniaturas de ~170 px, donde las seis diapositivas de un ejemplo se ven a
  la vez.

## Gráficas

- **Barras de error.** Una columna titulada «±», «error», «sd», «sem» o «desv» no
  es una serie: es la incertidumbre de la anterior. El eje se ensancha para que
  la barra quepa entera, y viaja igual al PDF.
- **Ejes logarítmicos**, con marcas por décadas. Un cero o un negativo no tiene
  logaritmo: queda fuera del dibujo y el editor dice cuántos. Con el eje Y en
  logaritmo el ajuste se hace sobre el logaritmo —la linealización de siempre— y
  se reporta como `log₁₀ y = m x + b`.
- La ecuación del ajuste y su R² llegan por fin al PDF; estaban sólo en pantalla.
- El margen izquierdo se ajusta al rótulo más largo, el eje llega hasta el dato
  que dibuja, las medidas se marcan cuando son pocas y las columnas numéricas de
  una tabla se alinean a la derecha, también en Beamer.

## PowerPoint

Dos averías que ninguna comprobación de estructura detecta, encontradas al abrir
el archivo con un lector OOXML independiente y con LibreOffice Impress:

- El SmartArt —y con él las estructuras, los montajes y la geometría— llegaba
  como una hilera de rótulos sueltos, sin cajas, sin flechas y sin color.
- Una diapositiva salía en blanco en aproximadamente dos de cada cinco
  exportaciones, con formas escritas con `sz="NaN"`.

## Química

- Los rótulos de elemento (N azul, O rojo…) llegan al PDF con su color, y el
  rótulo se recorta contra el papel del tema en vez de contra un parche blanco.
- El montaje de laboratorio y las estructuras se reparten en catálogo/modelo,
  motor y editor, con **una sola tabla de decisiones que leen la pantalla y el
  PDF**: donde había dos copias, ya habían divergido.

## Comprobado

73 pruebas automáticas (eran 37 en 0.1.0), build reproducible, los 12 ejemplos se
regeneran idénticos y el ZIP publicado tiene el mismo sha256 en dos compilaciones.
Los paquetes de PowerPoint se abrieron con python-pptx y se convirtieron a PDF con
LibreOffice Impress sin ninguna diapositiva en blanco.

`docs/validacion.md` detalla el alcance y los límites. Los que siguen en pie: el
`.tex` no se ha compilado con una distribución LaTeX, el `.pptx` no se ha abierto
en Microsoft PowerPoint, y todos los datos de los ejemplos son ilustrativos.
