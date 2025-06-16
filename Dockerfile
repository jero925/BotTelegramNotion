# Usa una imagen oficial de Node.js como base
FROM node:22.16.0

# Establece el directorio de trabajo en el contenedor
WORKDIR /app

# Copia solo los archivos de dependencias primero (para aprovechar la cache)
COPY package*.json ./

# Instala las dependencias de producción (usa `npm ci` si estás en CI/CD)
RUN npm install

# Copia el resto del código fuente
COPY . .

# Healthcheck para verificar que la app está corriendo
# HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
#   CMD curl --fail http://localhost:3000/health || exit 1

# Comando por defecto para ejecutar la app
CMD ["node", "src/index.js"]
