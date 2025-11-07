##############################
# Stage 1: Builder
##############################
FROM python:3.13 AS builder

# Directorio de trabajo
WORKDIR /app

# Copiamos todo el proyecto
COPY . .

# Instalamos dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Inicializamos Reflex (si ya existe, no hace nada malo)
RUN reflex init

##############################
# Stage 2: Runtime
##############################
FROM python:3.13-slim

WORKDIR /app

# Copiar instalación de Python del builder
COPY --from=builder /usr/local /usr/local

# Copiar el proyecto completo
COPY --from=builder /app /app

# Exponer puertos por defecto de Reflex
EXPOSE 3000 8000

# Necesario hasta que Reflex maneje SIGTERM correctamente
STOPSIGNAL SIGKILL

# Iniciar Reflex en modo producción
CMD ["reflex", "run", "--env", "prod"]
