#!/usr/bin/env bash

# Strict mode
set -euo pipefail

# --- Colores ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Funciones de Log ---
info() { printf "${BLUE}[INFO]${NC} %s\n" "$*"; }
success() { printf "${GREEN}[ÉXITO]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[AVISO]${NC} %s\n" "$*"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$*"; }

# --- Banner ASCII ---
print_banner() {
    clear
    printf "${CYAN}"
    cat << "EOF"
   ____                      ______           _         
  / __ \                    |  ____|         | |        
 | |  | |_ __   ___ _ __    | |__ __ _  ___| |_ _   _ 
 | |  | | '_ \ / _ \ '_ \   |  __/ _` |/ __| __| | | |
 | |__| | |_) |  __/ | | |  | | | (_| | (__| |_| |_| |
  \____/| .__/ \___|_| |_|  |_|  \__,_|\___|\__|\__,_|
        | |                                           
        |_|  Software de Facturación Open Source      
EOF
    printf "${NC}\n"
    printf "${PURPLE}====================================================${NC}\n"
}

# --- Dependencias ---
check_and_install() {
    local cmd=$1
    local install_cmd=$2
    if ! command -v "$cmd" &> /dev/null; then
        warn "$cmd no está instalado. Intentando instalación automática..."
        eval "$install_cmd" || { error "Fallo al instalar $cmd."; exit 1; }
    fi
}

detect_os_and_install_deps() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt &> /dev/null; then PKG="sudo apt update && sudo apt install -y"
        elif command -v pacman &> /dev/null; then PKG="sudo pacman -S --noconfirm"
        elif command -v dnf &> /dev/null; then PKG="sudo dnf install -y"
        else return; fi
        check_and_install "docker" "$PKG docker.io"
        check_and_install "node" "$PKG nodejs npm"
        check_and_install "lsof" "$PKG lsof"
    fi
}

setup_storage() {
    mkdir -p storage/db_data storage/pdfs storage/config
}

# --- Gestión de Puertos Inteligente ---
manage_port_conflict() {
    local port=$1
    local env_var=$2
    local service_name=$3

    warn "Conflicto: El puerto $port ($service_name) ya está en uso."
    
    # Intentar identificar el proceso con lsof (con sudo para ver todo)
    local pid=""
    if command -v lsof &> /dev/null; then
        pid=$(sudo lsof -t -i :"$port" 2>/dev/null || true)
    fi

    # Si no hay PID, intentar con ss o fuser
    if [ -z "$pid" ] && command -v fuser &> /dev/null; then
        pid=$(sudo fuser "$port/tcp" 2>/dev/null | awk '{print $NF}' || true)
    fi

    if [ -n "$pid" ]; then
        local proc_name=$(echo "$pid" | xargs ps -p -o comm= 2>/dev/null | head -n 1 || echo "desconocido")
        info "Detectado proceso(s) '$proc_name' (PID: $pid) ocupando el puerto $port."
    else
        warn "No se pudo identificar el proceso exacto. Podría ser un servicio del sistema o de otro usuario."
    fi

    echo -e "${YELLOW}¿Qué deseas hacer?${NC}"
    if [ -n "$pid" ]; then
        echo "  [k] MATAR el proceso(s) $pid y seguir usando el puerto $port"
    else
        echo "  [k] Intentar MATAR el proceso en el puerto $port (requiere fuser/lsof)"
    fi
    echo "  [c] CAMBIAR el puerto de OpenFactu para este servicio"
    echo "  [a] ABORTAR la instalación"
    echo -n "Selecciona una opción (k/c/a): "
    read -r opt

    case $opt in
        k|K)
            if [ -n "$pid" ]; then
                info "Matando procesos..."
                echo "$pid" | xargs sudo kill -9
                success "Puerto $port liberado."
            else
                info "Intentando liberar puerto $port usando fuser..."
                sudo fuser -k "$port/tcp" || true
                sleep 2
                if ! ss -tuln | grep -q ":$port "; then
                    success "Puerto $port liberado."
                else
                    error "No se pudo liberar el puerto $port. Libéralo manualmente."
                    exit 1
                fi
            fi
            ;;
        c|C)
            echo -n "Introduce el nuevo puerto para $service_name: "
            read -r new_port
            info "Cambiando $env_var de $port a $new_port en .env..."
            if grep -q "^$env_var=" .env; then
                sed -i "s/^$env_var=.*/$env_var=$new_port/" .env
            else
                echo "$env_var=$new_port" >> .env
            fi
            success "Configuración actualizada. OpenFactu usará el puerto $new_port."
            ;;
        *)
            error "Instalación abortada por el usuario."
            exit 1
            ;;
    esac
}

check_ports() {
    [ ! -f .env ] && cp .env.example .env
    
    local s_port=$(grep "^SERVER_PORT=" .env | cut -d'=' -f2 || echo "3000")
    local w_port=$(grep "^WEB_PORT=" .env | cut -d'=' -f2 || echo "8080")
    local d_port=$(grep "^DB_PORT=" .env | cut -d'=' -f2 || echo "5432")
    local db_user=$(grep "^POSTGRES_USER=" .env | cut -d'=' -f2 || echo "openfactu")

    while ss -tuln | grep -q ":$s_port "; do manage_port_conflict "$s_port" "SERVER_PORT" "Backend"; s_port=$(grep "^SERVER_PORT=" .env | cut -d'=' -f2); done
    while ss -tuln | grep -q ":$w_port "; do manage_port_conflict "$w_port" "WEB_PORT" "Web"; w_port=$(grep "^WEB_PORT=" .env | cut -d'=' -f2); done
    while ss -tuln | grep -q ":$d_port "; do manage_port_conflict "$d_port" "DB_PORT" "Database"; d_port=$(grep "^DB_PORT=" .env | cut -d'=' -f2); done
}

# --- Main ---
main() {
    print_banner
    info "Iniciando instalación profesional de OpenFactu..."

    detect_os_and_install_deps
    setup_storage
    check_ports

    info "Levantando el clúster de OpenFactu con Docker Compose..."
    # Añadimos reintentos para el pull de imágenes en caso de fallo de red
    info "Descargando imágenes (esto puede tardar según tu conexión)..."
    docker compose pull || { warn "Fallo al descargar imágenes. Reintentando..."; sleep 5; docker compose pull; }

    docker compose up -d --build
# Inicialización de tablas globales (public)
    info "Inicializando tablas del sistema en la base de datos..."
    sleep 3
    
    # 1. Drizzle crea las tablas globales en public y limpia las de negocio
    docker compose exec -T server npm run db:push:public

    # 2. LIMPIEZA INTELIGENTE (Borrar todo excepto lo global)
    info "Ejecutando limpieza selectiva del esquema public..."
    
    # Este comando de SQL genera un DROP TABLE para cada tabla que NO sea una de las protegidas
    local db_user=$(grep "^POSTGRES_USER=" .env | cut -d'=' -f2 || echo "openfactu")
    docker compose exec -T db psql -U "$db_user" -d openfactudb -c "
    DO \$\$ 
    DECLARE 
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename NOT IN ('Tenant', 'GlobalUser', 'PluginField', '_prisma_migrations')
        ) LOOP
            EXECUTE 'DROP TABLE IF EXISTS \"' || r.tablename || '\" CASCADE';
        END LOOP;
    END \$\$;"

    success "Esquema public saneado. Solo se conservan tablas globales."

    local final_web_port=$(grep "^WEB_PORT=" .env | cut -d'=' -f2 || echo "8080")
    local final_srv_port=$(grep "^SERVER_PORT=" .env | cut -d'=' -f2 || echo "3000")

    echo ""
    success "¡OpenFactu desplegado con éxito!"
    printf "Configuración Web: ${CYAN}http://localhost:${final_web_port}/setup${NC}\n"
    printf "API Backend: ${CYAN}http://localhost:${final_srv_port}/health${NC}\n"
    echo ""
}

main "$@"
