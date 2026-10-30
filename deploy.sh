#!/usr/bin/env bash
# ==============================================================================
# SURGAS - Script de Despliegue Automatizado en Producción (VPS)
# Subdominio: asistenciaplanta.surgascard.com
# ==============================================================================

set -e

# Colores de salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}🚀 SURGAS - Despliegue de Asistencia Planta en Producción${NC}"
echo -e "${BLUE}   Dominio: asistenciaplanta.surgascard.com${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Verificar Node.js y NPM
echo -e "\n${YELLOW}[1/6] Verificando entorno Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js no está instalado. Instalando Node.js LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo -e "${GREEN}✔ Node.js versión: $(node -v)${NC}"
echo -e "${GREEN}✔ NPM versión: $(npm -v)${NC}"

# 2. Configurar archivo .env de producción
echo -e "\n${YELLOW}[2/6] Verificando variables de entorno (.env)...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando archivo .env para producción (Puerto 3005)...${NC}"
    cat <<EOF > .env
PORT=3005
NODE_ENV=production

# Conexión MariaDB / MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=asistencia_planta
EOF
    echo -e "${GREEN}✔ Archivo .env generado. (Modifícalo si tu MariaDB tiene contraseña para root).${NC}"
else
    # Si existía con PORT=3000, migrar a 3005 para evitar colisión con otras apps
    sed -i 's/PORT=3000/PORT=3005/g' .env
    # Forzar IPv4 127.0.0.1 para evitar ECONNREFUSED ::1
    sed -i 's/DB_HOST=localhost/DB_HOST=127.0.0.1/g' .env
    echo -e "${GREEN}✔ Archivo .env verificado (Puerto 3005 y DB 127.0.0.1).${NC}"
fi

# 3. Instalar dependencias de Node
echo -e "\n${YELLOW}[3/6] Instalando dependencias de Node.js...${NC}"
npm install --omit=dev
echo -e "${GREEN}✔ Dependencias instaladas correctamente.${NC}"

# 4. Importar Base de Datos MariaDB (script.sql)
echo -e "\n${YELLOW}[4/6] Configurando Base de Datos MariaDB (script.sql)...${NC}"
if command -v mariadb &> /dev/null; then
    DB_CMD="mariadb"
elif command -v mysql &> /dev/null; then
    DB_CMD="mysql"
else
    echo -e "${RED}MariaDB/MySQL no está instalado en este VPS.${NC}"
    echo -e "${YELLOW}Instalando MariaDB Server...${NC}"
    sudo apt-get update && sudo apt-get install -y mariadb-server
    sudo systemctl enable --now mariadb
    DB_CMD="mariadb"
fi

# Intentar importar directamente con sudo (autenticación por socket Unix típica en Debian/Ubuntu)
if sudo $DB_CMD < script.sql 2>/dev/null; then
    echo -e "${GREEN}✔ Base de datos 'asistencia_planta' importada exitosamente mediante sudo $DB_CMD.${NC}"
else
    echo -e "${YELLOW}Se requiere credenciales para acceder a $DB_CMD.${NC}"
    read -p "Ingresa usuario MySQL [root]: " DB_USER_INPUT
    DB_USER_INPUT=${DB_USER_INPUT:-root}
    read -sp "Ingresa contraseña para $DB_USER_INPUT: " DB_PASS_INPUT
    echo ""
    $DB_CMD -u "$DB_USER_INPUT" -p"$DB_PASS_INPUT" < script.sql
    echo -e "${GREEN}✔ Base de datos importada exitosamente.${NC}"
fi

# 5. Iniciar / Reiniciar proceso de Node.js con PM2
echo -e "\n${YELLOW}[5/6] Configurando gestor de procesos PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Instalando PM2 globalmente...${NC}"
    sudo npm install -g pm2
fi

# Iniciar o recargar con ecosystem.config.js
pm2 startOrReload ecosystem.config.js --update-env
pm2 restart asistencia-planta --update-env || true
pm2 save
# Configurar inicio automático del sistema si aún no está
pm2 startup systemd -u "$(whoami)" --hp "$HOME" | grep -E "sudo env" | bash 2>/dev/null || true
echo -e "${GREEN}✔ Aplicación Node.js en ejecución y configurada para autoarranque.${NC}"

# 6. Configurar Nginx Reverse Proxy
echo -e "\n${YELLOW}[6/6] Configurando Nginx para asistenciaplanta.surgascard.com...${NC}"
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Instalando Nginx...${NC}"
    sudo apt-get update && sudo apt-get install -y nginx
fi

NGINX_CONF="/etc/nginx/sites-available/asistenciaplanta.surgascard.com.conf"
NGINX_LINK="/etc/nginx/sites-enabled/asistenciaplanta.surgascard.com.conf"

sudo cp "$APP_DIR/nginx/asistenciaplanta.surgascard.com.conf" "$NGINX_CONF"
sudo ln -sf "$NGINX_CONF" "$NGINX_LINK"

# Probar sintaxis de Nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✔ Nginx configurado y recargado exitosamente.${NC}"
else
    echo -e "${RED}Error en la configuración de Nginx. Por favor revisa el archivo de configuración.${NC}"
    exit 1
fi

# 7. Configurar SSL con Certbot (Esencial para que Nginx no derive las conexiones HTTPS a otra web)
echo -e "\n${YELLOW}[7/7] Verificando Certificado SSL HTTPS para asistenciaplanta.surgascard.com...${NC}"
if command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Generando / actualizando certificado SSL para asistenciaplanta.surgascard.com...${NC}"
    sudo certbot --nginx -d asistenciaplanta.surgascard.com --redirect --agree-tos --register-unsafely-without-email --non-interactive || sudo certbot --nginx -d asistenciaplanta.surgascard.com || true
    echo -e "${GREEN}✔ SSL configurado. Ahora Nginx responderá en HTTPS sin cruzarse con otros sitios.${NC}"
else
    echo -e "${RED}Certbot no está instalado aún.${NC}"
    echo -e "${YELLOW}Instalando certbot...${NC}"
    sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d asistenciaplanta.surgascard.com || true
fi

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Tu aplicación está corriendo en el puerto 3005 y enlazada a Nginx con HTTPS."
echo -e "Accede en tu navegador a: https://asistenciaplanta.surgascard.com"
echo -e ""
echo -e "👉 Para ver los logs de la aplicación en tiempo real:"
echo -e "${YELLOW}   pm2 logs asistencia-planta${NC}"
echo -e "================================================================"

