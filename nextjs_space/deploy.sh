#!/bin/bash

# ===========================================
# DTNutrition - Script de Deploy
# ===========================================
# Uso: ./deploy.sh [--skip-deps] [--skip-migrate]

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse argumentos
SKIP_DEPS=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=true
      shift
      ;;
  esac
done

echo ""
echo "========================================="
echo "   DTNutrition - Deploy Script"
echo "========================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    log_error "Arquivo package.json não encontrado!"
    log_error "Execute este script na raiz do projeto."
    exit 1
fi

# Verificar arquivo .env.production
if [ ! -f ".env.production" ]; then
    log_error "Arquivo .env.production não encontrado!"
    log_error "Copie .env.production.example para .env.production e configure."
    exit 1
fi

# Criar diretórios de log se não existirem
log_info "Criando diretórios de log..."
mkdir -p /home/ubuntu/logs/dtnutrition
log_success "Diretórios de log criados"

# 1. Instalar dependências
if [ "$SKIP_DEPS" = false ]; then
    log_info "Instalando dependências..."
    npm ci --production=false
    log_success "Dependências instaladas"
else
    log_warn "Pulando instalação de dependências (--skip-deps)"
fi

# 2. Carregar variáveis de ambiente
log_info "Carregando variáveis de ambiente..."
set -a
source .env.production
set +a
log_success "Variáveis carregadas"

# 3. Gerar Prisma Client
log_info "Gerando Prisma Client..."
npx prisma generate
log_success "Prisma Client gerado"

# 4. Rodar migrações do banco
if [ "$SKIP_MIGRATE" = false ]; then
    log_info "Rodando migrações do banco de dados..."
    npx prisma migrate deploy
    log_success "Migrações aplicadas"
else
    log_warn "Pulando migrações (--skip-migrate)"
fi

# 5. Build do Next.js
log_info "Fazendo build do Next.js..."
NODE_ENV=production npm run build
log_success "Build concluído"

# 6. Copiar arquivos estáticos para standalone
log_info "Copiando arquivos estáticos..."
if [ -d "public" ]; then
    cp -r public .next/standalone/
    log_success "Pasta public copiada"
fi

if [ -d ".next/static" ]; then
    mkdir -p .next/standalone/.next/static
    cp -r .next/static .next/standalone/.next/
    log_success "Arquivos estáticos copiados"
fi

echo ""
echo "========================================="
log_success "Deploy preparado com sucesso!"
echo "========================================="
echo ""
echo "Próximos passos:"
echo "  1. Iniciar com PM2:  pm2 start ecosystem.config.js --env production"
echo "  2. Verificar status: pm2 status"
echo "  3. Ver logs:         pm2 logs dtnutrition"
echo "  4. Salvar config:    pm2 save"
echo ""
