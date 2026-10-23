# Efectivo Bolt

App web para el móvil que lleva el control del **efectivo** de cada día trabajando con Bolt y separa:

- **De Bolt**: la suma de los precios de los viajes pagados en efectivo (lo que tienes que separar para la empresa).
- **Mis propinas**: lo que te queda de más porque no tenías cambio (o lo que pones tú si al cliente le faltaba).
- **Efectivo total**: todo el dinero que te has quedado ese día.

## Cómo se usa

1. **En cada viaje en efectivo** apunta el precio que marca Bolt. Si te da más, apunta lo que te dio y lo que le devuelves: la app calcula la propina sola.
   - Ejemplo: viaje de 8,70 €, te da 10 € y le devuelves 1 € → propina 0,30 €.
2. **Al final del día** (sección *Cierre del día*): pon el cambio con el que empezaste y el dinero que cuentas en la cartera. La app te dice:
   - cuánto deberías tener y si cuadra,
   - la **propina real** según el recuento (contado − cambio inicial − Bolt),
   - cuánto separar para Bolt.

   Si no te da tiempo de apuntar cada propina, apunta solo los precios y deja que el recuento calcule la propina.
3. **Historial**: totales de la semana, el mes o todo, día por día. Toca un día para abrirlo.
4. **Copia**: descarga un CSV para Excel o una copia de seguridad (JSON) que puedes restaurar.

Los datos se guardan **solo en tu móvil** (en el navegador). Haz una copia de seguridad de vez en cuando.

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
