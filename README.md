# Efectivo Bolt

App web para el móvil que lleva el control del **efectivo** de cada día trabajando con Bolt y separa:

- **De Bolt**: la suma de los precios de los viajes pagados en efectivo (lo que tienes que separar para la empresa).
- **Mis propinas**: lo que te queda de más porque no tenías cambio (o lo que pones tú si al cliente le faltaba).
- **Efectivo total**: todo el dinero que te has quedado ese día.

## Cómo se usa (al final de la jornada)

1. **Pagos en efectivo de Bolt**: abre la app de Bolt, mira los viajes pagados en efectivo y mete cada importe. Puedes escribir varios seguidos separados por espacios (`7,5 9,21 12`). La app los suma.
2. **Cuenta tu dinero**: pon el cambio con el que empezaste (se recuerda para el día siguiente) y el efectivo que tienes al terminar.
3. **Resultado**:
   - **Para Bolt** = suma de los importes en efectivo → lo apartas.
   - **Efectivo cobrado** = lo que tienes − el cambio con el que empezaste.
   - **Mi propina** = efectivo cobrado − lo de Bolt → es tuyo.
4. **Banco**: cada vez que ingreses efectivo de Bolt en el banco, apúntalo aquí. La app lleva la cuenta de cuánto efectivo de Bolt tienes **sin ingresar** (lo de Bolt de todos los días − lo ingresado) y te avisa al acercarte al límite de 200 € (se puede cambiar). Arriba de la pantalla del día siempre ves ese saldo.
5. **Historial**: totales de la semana, el mes o todo, día por día. Toca un día para abrirlo o corregirlo.
6. **Copia**: descarga un CSV para Excel o una copia de seguridad (JSON) que puedes restaurar.

## Dónde se guardan los datos

Todo lo que metes se guarda **solo en tu móvil**, dentro del almacenamiento del navegador (`localStorage`). No se envía a ningún servidor ni a GitHub: el repositorio solo tiene el código de la app.

Por eso:
- Si borras los datos del navegador, desinstalas el navegador o cambias de móvil, se pierden.
- Haz de vez en cuando *Copia → Descargar copia de seguridad* y guarda el archivo (Drive, correo, WhatsApp…). Con *Restaurar copia* lo recuperas en cualquier móvil.

## Instalarla en el móvil

La app tiene que estar publicada en una web (por ejemplo, GitHub Pages):

1. En GitHub: *Settings → Pages → Deploy from a branch* y elige la rama y la carpeta `/ (root)`.
2. Abre la dirección que te da GitHub en el móvil.
3. **Android (Chrome)**: menú ⋮ → *Añadir a pantalla de inicio*.
   **iPhone (Safari)**: botón compartir → *Añadir a pantalla de inicio*.

Después funciona como una app normal, también sin conexión.

## Archivos

- `index.html` – pantallas
- `styles.css` – diseño (modo claro y oscuro)
- `app.js` – lógica y cálculos (en céntimos para no tener errores de redondeo)
- `sw.js`, `manifest.json`, `icon.svg` – para instalarla y que funcione sin internet
