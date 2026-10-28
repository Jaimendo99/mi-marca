# Música de fondo del video promocional

Las tres canciones son de **dominio público (CC0 1.0)**: se pueden usar en videos comerciales,
sin dar crédito y sin pagar derechos. Vienen de FreePD.com (Kevin MacLeod), que publicaba todo
bajo «CC0 1.0 Universal Public Domain Dedication». FreePD cerró en 2025; los originales están en
https://archive.org/details/freepd y en las páginas archivadas de https://web.archive.org/web/2021/https://freepd.com/

| Estilo    | Archivo              | Canción         | Autor       | Categoría en FreePD |
|-----------|----------------------|-----------------|-------------|---------------------|
| Tranquila | `pond.mp3`           | Pond            | Rafael Krux | Romantic            |
| Alegre    | `advertime.mp3`      | Advertime       | Rafael Krux | Upbeat              |
| Elegante  | `3-am-west-end.mp3`  | 3 am West End   | statusq     | Electronic          |

Cada archivo se preparó con `process.sh` (en esta carpeta): sin el silencio del inicio, recortado
a 2 minutos con 3 s de salida suave, el primer minuto igualado a -16 LUFS, MP3 estéreo de 128 kbps.

    ./process.sh original.mp3 music/nombre.mp3 120 3

Para cambiar una canción: crea el archivo con **otro nombre** (los teléfonos guardan la música
para siempre por nombre), y actualiza `SONGS` en `app.js`, `TRACKS` en `sw.js` y esta tabla.
