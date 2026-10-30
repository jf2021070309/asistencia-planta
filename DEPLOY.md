# 🚀 Guía de Despliegue en VPS (Producción)

Sistema de **Control de Asistencia del Personal y Despacho de Balones de Gas (SURGAS)**.

* **Subdominio de Producción:** [asistenciaplanta.surgascard.com](http://asistenciaplanta.surgascard.com)
* **Puerto Interno:** `3005` (independiente de otras aplicaciones como `surgas-chatbot` en el puerto 3000)
* **Stack:** Node.js + Express + MariaDB / MySQL + Nginx (Reverse Proxy) + PM2 (Daemon)

---

## 📋 Requisitos Previos

1. **Configurar el registro DNS:**
   En tu panel de DNS (Cloudflare, cPanel, Namecheap, etc.), crea un registro **Tipo A**:
   * **Nombre / Host:** `asistenciaplanta` (o `asistenciaplanta.surgascard.com`)
   * **Valor / Destino:** `IP_PUBLICA_DE_TU_VPS`
   * **Proxy:** En gris / DNS Only (recomendado para emitir el certificado SSL inicial con Certbot).

2. **Acceso SSH a tu VPS:**
   ```bash
   ssh usuario@IP_PUBLICA_DE_TU_VPS
   ```

---

## ⚡ Despliegue Automatizado en 1 Solo Paso

El proyecto incluye un script de despliegue integral (`deploy.sh`) que:
- Instala Node.js y NPM si no están presentes.
- Genera el archivo `.env` de producción.
- Instala dependencias con `npm install --omit=dev`.
- Instala e importa [`script.sql`](./script.sql) en MariaDB (crea base de datos `asistencia_planta`, personal, esquelas y asistencias de setiembre y octubre).
- Instala y configura **PM2** para que la app se ejecute en segundo plano y arranque tras reinicios del servidor.
- Instala y enlaza la configuración de **Nginx** para `asistenciaplanta.surgascard.com`.

### 1. Clonar o actualizar el repositorio en el VPS

Si es la primera vez (por ejemplo en `/var/www/asistencia-planta`):
```bash
sudo mkdir -p /var/www/asistencia-planta
sudo chown -R $USER:$USER /var/www/asistencia-planta
git clone <URL_DE_TU_REPOSITORIO_GIT> /var/www/asistencia-planta
cd /var/www/asistencia-planta
```

Si el repositorio ya está clonado, simplemente actualízalo:
```bash
cd /var/www/asistencia-planta
git pull
```

### 2. Ejecutar el script de despliegue

Dale permisos de ejecución y ejecútalo:
```bash
chmod +x deploy.sh
./deploy.sh
```

El script te guiará y dejará la aplicación en funcionamiento en cuestión de segundos.

---

## 🔒 Activar Certificado SSL Gratuito (HTTPS)

Una vez que el DNS ya apunte a tu VPS y el script haya finalizado, ejecuta Certbot para obtener el candado verde SSL:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d asistenciaplanta.surgascard.com
```

Certbot actualizará automáticamente la configuración de Nginx para redirigir todo el tráfico HTTP a HTTPS de manera segura.

---

## 🛠️ Comandos de Mantenimiento y Operación

### Control de la Aplicación (PM2)
```bash
# Ver el estado del servicio
pm2 status

# Ver logs en tiempo real (consultas, peticiones, errores)
pm2 logs asistencia-planta

# Reiniciar la aplicación
pm2 restart asistencia-planta

# Detener o iniciar
pm2 stop asistencia-planta
pm2 start asistencia-planta
```

### Base de Datos MariaDB
```bash
# Entrar a la consola de MariaDB
sudo mariadb -u root -p

# Comprobar registros
sudo mariadb -e "USE asistencia_planta; SELECT COUNT(*) FROM personal; SELECT COUNT(*) FROM asistencias;"
```

### Servidor Web Nginx
```bash
# Verificar sintaxis de configuración
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/asistenciaplanta.access.log
sudo tail -f /var/log/nginx/asistenciaplanta.error.log
```

---

## 🔄 Actualizaciones Futuras del Código

Cuando realices cambios y los subas a tu repositorio Git, para actualizar tu VPS solo necesitas:

```bash
cd /var/www/asistencia-planta
git pull
pm2 restart asistencia-planta
```
*(Si agregaste dependencias nuevas en `package.json`, corre `npm install --omit=dev` antes de reiniciar).*

