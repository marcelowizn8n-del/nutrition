# ✅ Nutrition - Checklist de Deploy

## 📋 Pré-Deploy

### Servidor
- [ ] Node.js 18+ instalado
- [ ] PM2 instalado globalmente (`npm install -g pm2`)
- [ ] PostgreSQL instalado e rodando
- [ ] Nginx instalado
- [ ] Firewall configurado (portas 80, 443 abertas)

### Banco de Dados
- [ ] Usuário PostgreSQL criado
- [ ] Banco de dados criado
- [ ] Privilégios concedidos ao usuário
- [ ] Conexão testada

### Código
- [ ] Repositório clonado na VPS
- [ ] Arquivo `.env.production` criado
- [ ] `DATABASE_URL` configurado corretamente
- [ ] `NEXTAUTH_SECRET` gerado (32+ caracteres)
- [ ] `NEXTAUTH_URL` configurado com domínio correto

---

## 🚀 Durante o Deploy

### Script de Deploy
- [ ] `deploy.sh` está executável (`chmod +x deploy.sh`)
- [ ] Dependências instaladas sem erros
- [ ] Prisma Client gerado
- [ ] Migrações do banco aplicadas
- [ ] Build do Next.js concluído
- [ ] Arquivos estáticos copiados

### PM2
- [ ] Diretórios de log criados (`/home/ubuntu/logs/nutrition/`)
- [ ] Aplicação iniciada com PM2
- [ ] Status mostra "online"
- [ ] `pm2 save` executado
- [ ] `pm2 startup` configurado

### Nginx
- [ ] Configuração copiada para `/etc/nginx/sites-available/`
- [ ] Symlink criado em `/etc/nginx/sites-enabled/`
- [ ] Domínio configurado corretamente
- [ ] `nginx -t` passou sem erros
- [ ] Nginx reiniciado/recarregado

### SSL (após Nginx)
- [ ] Certbot instalado
- [ ] Certificado obtido
- [ ] HTTPS funcionando
- [ ] Redirecionamento HTTP → HTTPS
- [ ] Renovação automática testada (`certbot renew --dry-run`)

---

## ✨ Pós-Deploy

### Testes de Funcionamento
- [ ] Página inicial carrega
- [ ] Login funciona
- [ ] 3D Avatar renderiza corretamente
- [ ] Dados do banco são exibidos
- [ ] Navegação entre páginas funciona
- [ ] Formulários submetem corretamente

### Testes de Performance
- [ ] Tempo de carregamento aceitável (<3s)
- [ ] Gzip está funcionando (verificar headers)
- [ ] Cache de arquivos estáticos funcionando
- [ ] Sem erros no console do navegador

### Segurança
- [ ] HTTPS forçado
- [ ] Headers de segurança presentes
- [ ] Não há variáveis sensíveis expostas
- [ ] Logs não contêm dados sensíveis

### Monitoramento
- [ ] PM2 logs funcionando
- [ ] Nginx logs funcionando
- [ ] Espaço em disco adequado
- [ ] Memória do servidor adequada

---

## 🔄 Checklist de Atualização

- [ ] `git pull` executado
- [ ] Verificar se há novas variáveis de ambiente
- [ ] Verificar se há migrações pendentes
- [ ] `./deploy.sh` executado
- [ ] `pm2 restart nutrition`
- [ ] Testar funcionalidades principais

---

## 📝 Informações do Deploy

| Item | Valor |
|------|-------|
| **Data do Deploy** | __________________ |
| **Versão/Commit** | __________________ |
| **Responsável** | __________________ |
| **Domínio** | __________________ |
| **IP do Servidor** | __________________ |
| **Porta da Aplicação** | 3006 |

---

## 🆘 Contatos de Emergência

| Responsável | Contato |
|-------------|--------|
| DevOps | __________________ |
| Backend | __________________ |
| Frontend | __________________ |
