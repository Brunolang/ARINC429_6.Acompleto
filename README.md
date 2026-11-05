# ARINC429_6.Acompleto

## Iniciar la aplicación

Se necesita Node.js y un servidor MySQL.

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` y completa el usuario y la contraseña de MySQL.
3. Crea la base de datos y sus tablas ejecutando `schema.sql` en MySQL:

   ```sql
   SOURCE schema.sql;
   ```

   También puedes importar ese archivo desde phpMyAdmin. El script crea la
   base de datos `arinc429`, que es el valor predeterminado de `DB_NAME`.
4. Inicia el servidor con `npm start` y abre <http://localhost:3000>.

   Como alternativa a importar `schema.sql`, ejecuta `npm run setup-db` después
   de crear la base de datos.

Los instrumentos se guardan en MySQL y aparecen en el selector del panel. Cada
envío genera una palabra ARINC 429 BNR de 32 bits y una tensión calculada entre
0 y 5 V; ambos resultados y el valor original se guardan en `envios`. La palabra
usa el label octal con sus bits invertidos, SDI 0, SSM de operación normal y
paridad impar. El valor se escala linealmente al rango BNR con signo de 19 bits,
porque no se configuró una resolución específica por label. La tensión se escala
linealmente desde el mínimo/máximo del instrumento. Estos cálculos son para el
registro y la demostración: no se transmite a hardware ARINC 429 ni a un
auricular físico.

Si ya tenías la base de datos creada, ejecuta `npm run setup-db` para agregar
las columnas `palabra_hex` y `tension` sin borrar los registros existentes.