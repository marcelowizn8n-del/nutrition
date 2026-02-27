# Guia de Deploy - Digital Twins (VPS)

Este guia descreve como colocar sua aplicação Digital Twins em produção usando Docker.

## Pré-requisitos na VPS

1.  **Acesso SSH** à sua máquina.
2.  **Git** instalado.
3.  **Docker** e **Docker Compose** instalados.

## 1. Preparação (Sua Máquina Local -> VPS)

Você precisa enviar os arquivos para o servidor. A maneira mais fácil é via Git.

### Opção A: Usando Git (Recomendado)

Se seu código já estiver em um repositório (GitHub/GitLab):

1.  Acesse sua VPS: `ssh usuario@seu-ip`
2.  Clone o repositório:
    ```bash
    git clone https://seu-repositorio.com/digital-twins.git
    cd digital-twins/nextjs_space
    ```

### Opção B: Copiando Arquivos manualmente (SCP)

Se não usar Git, copie a pasta do projeto:

```bash
# Na sua máquina local
scp -r ./nextjs_space usuario@seu-ip:/home/usuario/app
```

## 2. Configuração e Execução

Dentro da pasta `nextjs_space` na sua VPS:

### Passo 1: Configurar Variáveis de Ambiente (Opcional)

Se precisar de chaves secretas, crie um arquivo `.env` (o Dockerfile já configura o básico):
```bash
nano .env
# Adicione suas chaves aqui se necessário
```

### Passo 2: Iniciar a Aplicação

Use o Docker Compose para criar e rodar o container:

```bash
docker compose up -d --build
```
* `-d`: Roda em segundo plano (detached).
* `--build`: Força a construção da imagem.

### Passo 3: Criar o Banco de Dados

Como estamos usando SQLite, precisamos garantir que o banco seja criado e migrado dentro do volume. O `docker-compose.yml` já está configurado para rodar as migrações ao iniciar.

Para popular o banco com dados iniciais (Seed):

```bash
docker compose exec web npx prisma db seed
```

## 3. Comandos Úteis

*   **Ver logs**:
    ```bash
    docker compose logs -f
    ```
*   **Parar aplicação**:
    ```bash
    docker compose down
    ```
*   **Reiniciar**:
    ```bash
    docker compose restart
    ```

## 4. Configurando Domínio e SSL (Nginx)

Para colocar seu app em `digitaltwin.dttools.app` com HTTPS, usaremos o **Nginx** como Proxy Reverso.

### Passo 1: Instalar Nginx e Certbot
Na sua VPS:
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Passo 2: Configurar o Nginx
Crie um arquivo de configuração para o seu site:
```bash
sudo nano /etc/nginx/sites-available/digitaltwin
```

Copie o conteúdo do arquivo `nginx.conf.example` que está na pasta do projeto, ou use este modelo:

```nginx
server {
    server_name digitaltwin.dttools.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/digitaltwin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Passo 3: Ativar SSL (HTTPS)
O Certbot configura o certificado SSL automaticamente e de graça:

```bash
sudo certbot --nginx -d digitaltwin.dttools.app
```
Siga as instruções na tela e pronto! Seu app estará seguro e acessível.
