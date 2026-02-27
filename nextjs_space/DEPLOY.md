# 🚀 Nutrition - Guia de Deploy

Este guia explica como fazer o deploy do Nutrition em uma VPS com Ubuntu.

## 📋 Pré-requisitos

### Software necessário na VPS:

```bash
# Node.js 18+ (recomendado usar NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# PM2 (gerenciador de processos)
npm install -g pm2

# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Nginx
sudo apt install nginx
```

### Configuração do PostgreSQL:

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Criar usuário e banco
CREATE USER nutrition_user WITH PASSWORD 'SUA_SENHA_SEGURA';
CREATE DATABASE nutrition_prod OWNER nutrition_user;
GRANT ALL PRIVILEGES ON DATABASE nutrition_prod TO nutrition_user;
\q
```

## 📁 Estrutura de Pastas

```
/home/ubuntu/
├── workspace/
│   └── nutrition/
│       └── nextjs_space/     # Código da aplicação
└── logs/
    └── nutrition/          # Logs do PM2
```

## 🔧 Passo a Passo do Deploy

### 1. Clonar o Repositório

```bash
cd /home/ubuntu/workspace
git clone https://seu-repo.git nutrition
cd nutrition/nextjs_space
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.production.example .env.production

# Editar com suas configurações
nano .env.production
```

**Variáveis obrigatórias:**

| Variável | Descrição | Exemplo |
|----------|-----------|--------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `NODE_ENV` | Ambiente | `production` |
| `NEXTAUTH_URL` | URL base da aplicação | `https://seu-dominio.com.br` |
| `NEXTAUTH_SECRET` | Secret para JWT | Gere com `openssl rand -base64 32` |

### 3. Executar Script de Deploy

```bash
# Tornar executável
chmod +x deploy.sh

# Executar
./deploy.sh
```

O script vai:
- ✅ Instalar dependências
- ✅ Gerar Prisma Client
- ✅ Rodar migrações do banco
- ✅ Fazer build do Next.js
- ✅ Copiar arquivos estáticos

### 4. Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Verificar status
pm2 status

# Configurar auto-start no boot
pm2 startup
pm2 save
```

### 5. Configurar Nginx

```bash
# Copiar configuração
sudo cp nginx.conf.example /etc/nginx/sites-available/nutrition

# Editar domínio
sudo nano /etc/nginx/sites-available/nutrition

# Habilitar site
sudo ln -s /etc/nginx/sites-available/nutrition /etc/nginx/sites-enabled/

# Remover default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar e reiniciar
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configurar SSL (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com.br

# Configurar renovação automática
sudo certbot renew --dry-run
```

## 📊 Comandos Úteis PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs nutrition

# Ver logs de erro
pm2 logs nutrition --err

# Reiniciar aplicação
pm2 restart nutrition

# Parar aplicação
pm2 stop nutrition

# Deletar do PM2
pm2 delete nutrition

# Monitoramento em tempo real
pm2 monit
```

## 🔄 Atualizando a Aplicação

```bash
cd /home/ubuntu/workspace/nutrition/nextjs_space

# Baixar atualizações
git pull origin main

# Executar deploy (pule migrações se não houver mudanças no schema)
./deploy.sh

# ou se já instalou deps recentemente:
./deploy.sh --skip-deps

# Reiniciar PM2
pm2 restart nutrition
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs detalhados
pm2 logs nutrition --lines 100

# Verificar se a porta está livre
sudo lsof -i :3006

# Verificar variáveis de ambiente
cat .env.production
```

### Erro de conexão com banco

```bash
# Testar conexão
psql "postgresql://nutrition_user:SENHA@localhost:5432/nutrition_prod"

# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql
```

### Nginx retorna 502 Bad Gateway

```bash
# Verificar se a aplicação está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/nutrition_error.log

# Verificar se a porta está correta
curl http://127.0.0.1:3006
```

### Permissões de arquivo

```bash
# Corrigir permissões se necessário
sudo chown -R ubuntu:ubuntu /home/ubuntu/workspace/nutrition
chmod -R 755 /home/ubuntu/workspace/nutrition
```

## 📈 Monitoramento

### PM2 Keymetrics (opcional)

```bash
pm2 link YOUR_PRIVATE_KEY YOUR_PUBLIC_KEY
```

### Health Check

Adicione um endpoint de health check em sua aplicação:

```bash
curl https://seu-dominio.com.br/api/health
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `pm2 logs nutrition`
2. Verifique o status: `pm2 status`
3. Consulte este guia de troubleshooting
