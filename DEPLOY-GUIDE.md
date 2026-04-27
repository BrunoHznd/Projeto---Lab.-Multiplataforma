# Guia de Deploy - tiResolve (HTTP + Nginx + systemd)

Este guia passo a passo ensina como fazer o deploy do tiResolve no seu VPS usando:
- **Backend**: FastAPI rodando via systemd (Uvicorn)
- **Frontend Web**: React build estático servido pelo Nginx
- **Proxy**: Nginx fazendo reverse proxy para API em `/api`
- **Banco**: SQLite (pode evoluir para PostgreSQL depois)

---

## Pré-requisitos

Você já instalou:
- `nginx`
- `nodejs` + `npm`
- `python3`

### Pacote adicional necessário

Para criar virtual environment, instale também:
```bash
apt install python3.12-venv
```

---

## 1. Configurar Backend (FastAPI + systemd)

### 1.1 Criar virtual environment e instalar dependências

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 1.2 Criar arquivo `.env` com configurações de produção

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend

cat > .env << 'EOF'
DATABASE_URL=sqlite:///./tiresolve.db
SECRET_KEY=gera_uma_chave_segura_aqui_min_32_caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
APP_NAME=tiResolve
APP_VERSION=1.0.0
DEBUG=False
CORS_ORIGINS=["http://67.211.211.231"]
EOF
```

**Importante**: Troque `67.211.211.231` pelo IP ou domínio real do servidor, e `gera_uma_chave_segura_aqui_min_32_caracteres` por uma chave forte (ex: use `python -c "import secrets; print(secrets.token_urlsafe(32))"`).

### 1.3 Rodar migração do banco

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend
source venv/bin/activate
python migrate.py
```

### 1.4 Criar usuário admin inicial (opcional)

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend
source venv/bin/activate
python register_admin.py
```

Isso cria:
- Admin: `admin@fatec.sp.gov.br` / `admin123`
- Técnico: `tecnico@fatec.sp.gov.br` / `tech123`
- Usuário: `aluno@fatec.sp.gov.br` / `aluno123`

### 1.5 Criar arquivo de serviço systemd

```bash
sudo tee /etc/systemd/system/tiresolve-backend.service > /dev/null << 'EOF'
[Unit]
Description=tiResolve Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend
Environment="PATH=/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/bin"
ExecStart=/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 1.6 Habilitar e iniciar o serviço

```bash
sudo systemctl daemon-reload
sudo systemctl enable tiresolve-backend
sudo systemctl start tiresolve-backend
sudo systemctl status tiresolve-backend
```

### 1.7 Verificar se backend está respondendo

```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/health
```

Deve retornar JSON com status "online" e "healthy".

---

## 2. Configurar Frontend Web (React build)

### 2.1 Instalar dependências do frontend web

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/frontend/web

npm install
```

### 2.2 Ajustar API URL para produção

Edite o arquivo `frontend/web/services/api.js` e altere a linha:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

Para:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://67.211.211.231/api';
```

Ou melhor ainda, use caminho relativo (recomendado):

```javascript
const API_URL = process.env.REACT_APP_API_URL || '/api';
```

### 2.3 Criar build de produção

```bash
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/frontend/web

npm run build
```

Isso cria a pasta `build/` com os arquivos estáticos.

---

## 3. Configurar Nginx

### 3.1 Criar configuração do site

```bash
sudo tee /etc/nginx/sites-available/tiresolve > /dev/null << 'EOF'
server {
    listen 80;
    server_name 67.211.211.231;

    # Frontend web (arquivos estáticos)
    location / {
        root /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/frontend/web/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Headers CORS (se necessário)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Upload de imagens (se necessário)
    location /upload {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Aumentar limite de upload
        client_max_body_size 10M;
    }

    # Logs
    access_log /var/log/nginx/tiresolve-access.log;
    error_log /var/log/nginx/tiresolve-error.log;
}
EOF
```

**Importante**: Troque `67.211.211.231` pelo IP ou domínio real.

### 3.2 Habilitar o site e remover config padrão

```bash
sudo ln -s /etc/nginx/sites-available/tiresolve /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 3.3 Testar configuração do Nginx

```bash
sudo nginx -t
```

### 3.4 Reiniciar Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

---

## 4. Verificar Deploy

### 4.1 Acessar pelo navegador

Abra no navegador:
- `http://67.211.211.231` — deve mostrar o frontend web
- `http://67.211.211.231/api` — deve mostrar JSON da API (ou redirecionar para /docs)

### 4.2 Testar login

Use as credenciais padrão:
- Email: `admin@fatec.sp.gov.br`
- Senha: `admin123`

### 4.3 Verificar logs se algo der errado

```bash
# Logs do backend
sudo journalctl -u tiresolve-backend -f

# Logs do Nginx
sudo tail -f /var/log/nginx/tiresolve-error.log
```

---

## 5. Comandos úteis de operação

### Backend (systemd)

```bash
# Ver status
sudo systemctl status tiresolve-backend

# Reiniciar
sudo systemctl restart tiresolve-backend

# Parar
sudo systemctl stop tiresolve-backend

# Ver logs em tempo real
sudo journalctl -u tiresolve-backend -f
```

### Nginx

```bash
# Ver status
sudo systemctl status nginx

# Reiniciar
sudo systemctl restart nginx

# Recarregar config sem derrubar
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/tiresolve-error.log
sudo tail -f /var/log/nginx/tiresolve-access.log
```

---

## 6. Próximos passos (opcional)

- **HTTPS**: Instalar certbot e configurar Let's Encrypt
- **PostgreSQL**: Migrar de SQLite para PostgreSQL em produção
- **Firewall**: Configurar ufw para permitir apenas 80, 443 e 22
- **Monitoramento**: Adicionar Prometheus/Grafana para o backend

---

## Troubleshooting

### Backend não inicia
- Verifique se a porta 8000 está livre: `ss -lntp | grep 8000`
- Verifique logs: `sudo journalctl -u tiresolve-backend -n 50`
- Verifique se o venv foi ativado corretamente

### Nginx retorna 502 Bad Gateway
- Verifique se o backend está rodando: `curl http://127.0.0.1:8000/health`
- Verifique logs do Nginx: `sudo tail -f /var/log/nginx/tiresolve-error.log`

### Frontend não carrega
- Verifique se o build foi criado: `ls -la frontend/web/build/`
- Verifique permissões da pasta build
- Verifique logs do Nginx

### Erro de CORS
- Verifique se `CORS_ORIGINS` no `.env` está correto
- Verifique se o frontend está chamando `/api` ou o domínio correto
