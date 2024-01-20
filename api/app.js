const express = require('express');
const app = express();
const dotenv = require('dotenv').config();;
const cors = require('cors');

// Middleware para parsear el cuerpo de la petición como JSON
app.use(express.json());
app.use(cors())
app.use(cors({
    origin: '*', // Especifica el origen permitido (o '*' para permitir cualquier origen)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Métodos HTTP permitidos
    credentials: true, // Habilita el intercambio de cookies y credenciales
}));

// Deshabilita la cabecera 'x-powered-by' por motivos de seguridad
app.disable('x-powered-by');

const PORT = process.env.PORT ?? 1234; // Define el puerto en el que se ejecutará el servidor, usando 1234 como valor predeterminado si no se especifica en las variables de entorno

app.listen(PORT, () => {
    console.log(`server listening on port http://localhost:${PORT}`); // Inicia el servidor en el puerto especificado y muestra un mensaje en la consola cuando está listo
});