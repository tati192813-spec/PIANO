# Clara · Lectura progresiva de partituras de piano

Aplicación web en español que funciona localmente para los ejercicios y la partitura de ejemplo. Para importar nuevos PDF requiere cargar PDF.js desde Internet. Está diseñada para PC y admite uso en pantallas pequeñas. El objetivo es reconocer notas y construir acordes sin exigir tempo.

## Cómo empezar

1. Descomprime `Clara_2.2_compacta.zip` y **conserva todos los archivos juntos**.
2. Abre `index.html` en Chrome, Edge u otro navegador moderno.
3. Elige **Clave de sol**, **Clave de fa**, **Dos manos**, **Acordes** o **Mis partituras**.
4. Selecciona el nivel, las alteraciones y el método de respuesta, y pulsa **Empezar a practicar**.
5. Las preferencias, estadísticas y sesiones completadas se guardan mediante `localStorage` en ese navegador. Puedes exportarlas o importarlas desde **Mi progreso**.

**Para MIDI:** utiliza Chrome o Edge con soporte Web MIDI y concede acceso al dispositivo cuando se solicite. El teclado debe estar conectado como dispositivo MIDI, no solo como salida de sonido. Algunas configuraciones bloquean Web MIDI al abrir un archivo directamente; en ese caso, inicia un servidor local en esta carpeta (por ejemplo, con Python instalado: `python -m http.server 8000`) y abre `http://localhost:8000`. También es posible alojar los archivos en un sitio HTTPS. El modo **Dos manos** exige MIDI.


## NUEVO · Mis partituras: PDF original de «Corazón de niño»

Esta primera versión incluye las **seis páginas** que el usuario facilitó de
«Corazón de niño», de Raúl Di Blasio. Las páginas se rasterizan a buena
resolución manteniendo el grabado original; Clara superpone una marca fina sobre
la cabeza de la nota seleccionada. El resto de la partitura no se redibuja.

1. Abre Clara y entra en **Mis partituras** (en la barra superior o desde Inicio).
2. Selecciona **Mano derecha**, **Mano izquierda** o **Ambas manos**.
3. Deja desactivado «Acordes simultáneos» para leer **una nota cada vez**.
   Puedes activarlo como modo experimental para intentar tocar juntas las
   cabezas de nota alineadas.
4. Responde mediante el **piano virtual** o conecta tu **piano MIDI**. No hay
   exigencia de tempo. Si tocas una nota incorrecta, Clara te deja repetir.
5. El panel **Modo de estudio** se mantiene compacto. El piano virtual resalta las teclas correspondientes y, cuando está activada la opción «Mostrar nombres de las notas», muestra las alturas actuales en etiquetas de colores junto al teclado (sin repetir un resumen por manos en el panel lateral).
6. Puedes pulsar directamente sobre cualquier cabeza de nota detectada para
   empezar en ella y saltar entre páginas.
7. Si Clara reconoce mal una nota, abre **Reconocimiento y corrección de notas**, edita la altura (por ejemplo `Si♭4` o `Fa#5`) y la mano correspondiente y pulsa **Corregir y guardar**. Las correcciones y la última posición se
   guardan en `localStorage` para este navegador.

**Limitaciones importantes de esta versión:** la detección experimental se hace
con los glifos incrustados en este PDF vectorial. Se han localizado 2.045
cabezas de nota, pero NO se garantiza la identificación correcta de todas
las alturas, alteraciones, octavas, voces o acordes. En particular, los
pasajes con `8va`, cambios de clave, voces superpuestas y escritura avanzada
pueden necesitar correcciones. No se extrae el ritmo de forma fiable y por
tanto **no hay reproducción completa de la canción ni evaluación del tempo**.
Se trata de un modo de **práctica nota a nota**, no de un reproductor MIDI
reconstruido ni de una transcripción MusicXML.

## NUEVO · Importación de PDF con detección automática (beta)

1. Abre `index.html` en **Chrome** o **Edge**; para usar MIDI y guardar partituras se recomienda `http://localhost` o HTTPS. Los PDF importados se almacenan localmente en **IndexedDB**.
2. Entra en **Mis partituras → + Añadir PDF** y selecciona un archivo (máximo 25 MB, hasta 100 páginas). Clara necesita Internet para cargar **PDF.js 3.11.174** desde CDN; el PDF se procesa en tu navegador, no se envía a un servidor de Clara.
3. **La detección se inicia automáticamente**: busca símbolos musicales vectoriales Unicode (glifos SMuFL), líneas de pentagrama, claves y armaduras. Propone posiciones y alturas de nota, sin pedir que marques todo manualmente. La interfaz muestra cuántas notas encontró y avisa si hay páginas no compatibles.
4. **Revisa las notas antes de practicar**: comprueba especialmente alteraciones accidentales, cambios de clave, acordes y octavas (`8va`/`8vb`). Puedes seleccionar una cabeza de nota y corregirla desde **Reconocimiento y corrección de notas**.
5. Si el reconocimiento no encuentra notas, puedes activar **Marcar notas sobre el PDF** y anotar manualmente la altura de cada una. Si quieres repetir la detección, pulsa **Volver a detectar notas (beta)**. Las notas que tú hayas marcado se conservan.
6. Desactiva «Marcar notas» y practica con el teclado virtual o con tu piano MIDI. La validación sigue siendo **nota a nota sin exigencia de tempo**. «Acordes simultáneos» es experimental.
7. Puedes **Exportar copia** para guardar el PDF y las notas anotadas en un archivo `.clara.json` y restaurarla desde **+ Añadir PDF**.

**Alcance real de la automatización:** no es un motor OMR universal. Solo detecta automáticamente aquellos PDF vectoriales cuyos símbolos musicales sean legibles como caracteres de notación (por ejemplo, ciertos archivos exportados con MuseScore). Un PDF escaneado, una foto convertida en PDF, un PDF con glifos convertidos en curvas o fuentes incompatibles **no se reconocerá automáticamente**. En esos casos se ofrece el marcado manual. La aplicación no extrae fiablemente el ritmo, las voces, la simultaneidad ni la reproducción completa; el reconocimiento de armaduras y alteraciones está basado en heurísticas y puede equivocarse. **No debe considerarse una transcripción fiable sin revisión**. Para reconocer escaneos de forma general habría que integrar posteriormente un motor OMR especializado, como Audiveris, mediante un proceso local/servidor adicional.

Las anotaciones y partituras se guardan en el navegador/perfil/origen actual. Antes de borrar datos del navegador o cambiar de equipo, exporta tus copias de seguridad.

El script opcional `herramientas/preparar_pdf.py` permite preprocesar ciertos PDF MuseScore con Python/PyMuPDF, pero no hace falta para importar un PDF digital compatible y probar la detección en Clara.

## Mejoras de Clara 2.1

- Los silencios de redonda, blanca, negra, corchea y semicorchea y las alteraciones emplean símbolos vectoriales basados en la notación estándar (rutas SVG extraídas de **Noto Music**, licencia SIL Open Font License 1.1), sin depender de fuentes instaladas en el equipo del usuario. La notación sigue siendo un motor SVG propio, no un grabador musical profesional completo.
- En **Mis partituras** se puede mostrar u ocultar el piano virtual, que marca las notas de la selección actual con colores diferenciados por mano, incluso si están ocultos los nombres.
- El panel derecho de PDF se puede contraer, conservando la posición de práctica. El estado se guarda por partitura.
- Para ver notas simultáneas en una selección, activa **Ambas manos** y **Acordes simultáneos (beta)**: la detección de simultaneidad sigue siendo experimental.
- **Reconocimiento y corrección de notas** combina en un panel la edición de altura, cambio de mano, eliminación y marcado manual por coordenadas de PDF. Pulsa **Corregir y guardar** para confirmar los cambios del grupo. Las correcciones se guardan localmente y las partituras importadas pueden exportarse con las notas corregidas.
- Los PDF escaneados no adquieren reconocimiento musical automático por estas mejoras. Las alturas estimadas requieren revisión.

## Ajustes de Clara 2.2

- **Modo de estudio compacto**: solo muestra la selección de manos, acordes, opción de nombres, contador de nota, navegación y estado/conexión MIDI. Los mensajes de práctica siguen anunciándose a los lectores de pantalla.
- Eliminada la tarjeta lateral «PROTOTIPO»; las advertencias técnicas relevantes siguen disponibles en el apartado de reconocimiento y en este documento.
- Los nombres musicales se consultan junto al **piano virtual** cuando la opción está activada. El teclado sigue distinguiendo las manos mediante colores.
- El piano se coloca **justo debajo de la partitura**, dentro de una columna del mismo ancho. En pantallas de escritorio, el panel lateral tiene como altura máxima la de la partitura; si se abre un editor largo, puede desplazarse de forma independiente sin empujar el piano hacia abajo. En pantallas estrechas, los bloques se apilan para facilitar la lectura.

## Mejoras de grabado de los ejercicios habituales

- La cabeza de nota activa sigue cambiando únicamente a violeta, sin fondos.
- El espaciado horizontal ahora considera el valor de las figuras musicales.
- Las corcheas y semicorcheas consecutivas disponen de plicas agrupadas por
  barras de unión en los casos simples, en vez de una bandera individual por nota.
- Las líneas del pentagrama y la tinta principal son ligeramente más nítidas.

Esta mejora es **incremental**: Clara conserva su motor SVG original y no ha
sustituido todavía todo el grabado por una biblioteca profesional de maquetación.

## Los cuatro modos

- **Clave de sol:** seis niveles, de Mi4–Fa5 a Si2–Do8. En el último se utilizan indicaciones `8va` para registros altos.
- **Clave de fa:** seis niveles, de Sol2–La3 a La0–Re5. En el último se utilizan indicaciones `8vb` para registros bajos.
- **Dos manos:** cinco niveles; pentagrama superior en sol e inferior en fa o sol. Modalidad básica en negras y modalidad normal con figuras y silencios. Validación MIDI de eventos sucesivos o simultáneos con tolerancia configurable.
- **Acordes:** nueve etapas pedagógicas con las 17 tónicas y 10 familias solicitadas. Incluye inversiones, equivalencias enarmónicas configurables en texto y las fases construir → ver la partitura → repetir. En MIDI, se admite cualquier octava compatible y el pentagrama de corrección utiliza el registro real tocado.

## Evaluación y notación

- La nota activa se resalta únicamente en violeta (cabeza, plica y alteraciones), sin fondo ni flechas. Las líneas y espacios del pentagrama permanecen visibles.

- Los compases son de **4/4** y la duración escrita no es un cronómetro. Los silencios no requieren pulsación.
- Se mantienen las reglas de las alteraciones hasta la línea divisoria y se distinguen notas enarmónicas de alturas MIDI iguales.
- Una respuesta incorrecta **no avanza** el ejercicio. La tasa de aciertos al primer intento excluye los aciertos tras error o pista.
- La repetición inteligente equilibra la frecuencia de aparición y refuerza moderadamente contenidos con errores.
- El sistema propone avanzar al alcanzar el objetivo de precisión, tamaño de muestra y variedad de notas configurados.
- El piano virtual contiene las 88 teclas, de La0 a Do8.

## Arquitectura

- `index.html` — estructura y navegación.
- `styles.css` — diseño adaptable a escritorio y móvil.
- `music.js` — alturas, notación teórica, rangos, compases, catálogo de acordes y evaluación.
- `notation.js` — motor de representación SVG, clave de sol y clave de fa con trazados vectoriales independientes de las fuentes.
- `app.js` — navegación, sesiones, entradas de texto/virtual/MIDI, estadísticas y persistencia.
- `partituras.js` — posiciones y alturas detectadas de la partitura de ejemplo.
- `pdf-practice.js` — biblioteca de PDF en IndexedDB, importación, detección al añadir archivos, correcciones, copias locales y evaluación MIDI.
- `pdf-recognition.js` — detector experimental en navegador de glifos SMuFL y líneas de pentagrama. No es OMR de imágenes.
- `partituras/corazon-de-nino/` — imágenes de las páginas y datos de reconocimiento.
- `herramientas/preparar_pdf.py` — preparación opcional de PDFs vectoriales (Python).

Los módulos principales usan etiquetas `<script defer>` clásicas, sin un proceso de compilación. La importación de PDF nuevos carga PDF.js desde un CDN cuando se necesita; los ejercicios y el PDF de ejemplo siguen disponibles sin conectarse a Internet.

## Verificación realizada

La nueva función PDF se ha probado mediante pruebas automáticas de estructura
DOM simulada para comprobar la navegación, la superposición de notas, las 88
teclas virtuales y el avance al acertar mediante un evento MIDI simulado.
También se han probado la importación a una biblioteca IndexedDB simulada, el marcado manual de notas, la persistencia de anotaciones y el cambio de partitura.
Se han añadido pruebas unitarias de detección de pentagramas, armadura con bemoles, becuadros accidentales, simulación de análisis en PDF.js y rechazo de PDF sin glifos. También se ha verificado un ejemplo SVG redibujado con las nuevas barras de
unión. No se ha podido ejecutar una prueba completa de importación y reconocimiento de PDF real con PDF.js desde su CDN en un navegador
en este entorno, ni probar el acceso al CDN de PDF.js desde el navegador del usuario. Por tanto, la integración visual y el uso con un piano MIDI
físico deben comprobarse en tu equipo.



- Se comprobaron las **170 combinaciones** (17 tónicas × 10 familias) y **578 inversiones** posibles.
- Pruebas automáticas de 1.200 partituras en clave de sol/fa, 1.200 en dos pentagramas y 5.000 compases generados en 4/4.
- Pruebas de interacción en Chromium para los cuatro modos, teclado virtual, errores y repetición, pausa, guía, estadísticas y emulación de eventos Note On/Note Off MIDI.
- Comprobación visual de partitura e interfaz en tamaños de PC y móvil.

**Pendiente de verificar en cada equipo:** permisos y funcionamiento con el piano MIDI físico concreto, controladores y navegador del usuario. Las pruebas MIDI anteriores se hicieron con una entrada simulada, no con hardware real.

## Historial de Clara anterior

Si el navegador contiene datos locales de la anterior aplicación V2 (`claraReadingV2`), se conserva una copia como historial independiente de los nuevos resultados, sin mezclar indicadores incompatibles. Se incluye en la exportación JSON. También se pueden importar copias JSON V2 y V3 desde la pantalla de estadísticas.

## Ajustes de Clara 2.3: armaduras y progresión de lectura

- En **Clave de sol**, **Clave de fa** y **Dos manos**, **Armadura** y **Alteraciones accidentales** son controles independientes. Seleccionar «Ninguna» mantiene los sostenidos y bemoles propios de la tonalidad sin introducir alteraciones accidentales dentro de los compases.
- Ejemplo: con armadura de Sol mayor y sin accidentales, todos los fa escritos suenan como fa sostenido, sin repetir símbolos ♯ ante cada nota; el pentagrama muestra la armadura. No se alteran los ejercicios de acordes ni el análisis de PDF.
- La nueva **Distribución de notas** es «Progresiva» por defecto: en niveles desde 1.3 / 2.3 / 3.3 predominan las posiciones cercanas al pentagrama, con algunos ejercicios de líneas adicionales. En 1.5 y 2.5 los registros extremos se introducen ocasionalmente, en vez de surgir a cada paso. La primera nota de cada nueva partitura guiada aparece dentro del pentagrama. Los saltos próximos reciben un pequeño refuerzo.
- «Uniforme · todo el registro» permite volver al comportamiento de entrenamiento amplio cuando se desee practicar extremos. Los límites musicales de cada nivel no se han eliminado.
- La recomendación de dominio de niveles progresivos utiliza una exigencia de variedad alcanzable con el núcleo de notas más habitual.
