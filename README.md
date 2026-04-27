# 🖥️ tiResolve

**Sistema Multi-Tenant de Gestão de Chamados, Monitoramento e Inventário**

---

## 📋 Visão Geral

O tiResolve é um sistema completo para empresas e organizações gerenciarem:
- **Chamados técnicos** com chat em tempo real entre usuário/técnico
- **Monitoramento de máquinas** via agent Python instalado nos computadores
- **Inventário de equipamentos** com campos dinâmicos e controle de garantia
- **Multi-tenancy** — cada organização tem seus dados isolados com código de acesso único

## 🏗️ Arquitetura

```
Agents Python ──→ API FastAPI (0.0.0.0:8000) ──→ SQLite
                        ↑
              Web React (:3000)
              Mobile (Expo)
              Desktop (Electron)
```

## 📁 Estrutura do Projeto

```
ci-support-system/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entry point FastAPI
│   │   ├── config.py            # Configurações (.env)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/__init__.py   # 6 modelos: Org, User, Chamado, Log, Maquina, Inventario
│   │   ├── schemas/__init__.py  # Schemas Pydantic (request/response)
│   │   ├── routers/
│   │   │   ├── auth.py          # Login, registro, org, edição user, senha
│   │   │   ├── chamados.py      # CRUD chamados + chat + edição
│   │   │   ├── monitoramento.py # Agent + CRUD máquinas + download agent
│   │   │   └── inventario.py    # CRUD inventário
│   │   ├── services/
│   │   │   ├── auth_service.py       # JWT, bcrypt
│   │   │   ├── chamado_service.py    # Lógica de chamados
│   │   │   └── monitoramento_service.py # Lógica do agent
│   │   └── utils/dependencies.py     # Middleware auth
│   ├── migrate.py               # Script de migração
│   └── requirements.txt
│
├── frontend/
│   ├── mobile/           # React Native (Expo)
│   ├── web/              # React + React Native Web
│   └── desktop/          # React + Electron
│
├── agents/               # Agent de monitoramento
│   ├── monitor_agent.py
│   ├── config.json
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Como Executar

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate           # Windows

pip install -r requirements.txt
python migrate.py               # Criar/migrar tabelas

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

📌 Swagger: **http://localhost:8000/docs**

### 2. Frontend Mobile (Expo)

```bash
cd frontend/mobile

# Instalar dependências
npm install

# Executar
npx expo start
```

📌 Scaneie o QR Code com **Expo Go** no seu celular.

### 3. Frontend Web

```bash
cd frontend/web
npm install
npm start
```

📌 Acesse: **http://localhost:3000**

### 4. Frontend Desktop (Electron)

```bash
cd frontend/desktop

# Instalar dependências
npm install

# Executar em modo dev
npm run electron:dev

# Gerar executável .exe
npm run electron:build
```

### 5. Agent de Monitoramento

```bash
cd agents

# Instalar dependências
pip install -r requirements.txt

# Editar config.json com o ID da máquina e URL da API
# Executar
python monitor_agent.py
```

---

## 🔐 Primeiro Acesso

1. Inicie o backend
2. Registre um usuário ADMIN via API:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin","email":"admin@fatec.sp.gov.br","senha":"admin123","role":"ADMIN"}'
```
3. Use as credenciais para login no Web/Desktop/Mobile

---

## 📡 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login (JWT) |
| POST | `/auth/criar-organizacao` | Criar nova org + admin |
| POST | `/auth/registrar-com-id` | Cadastro com código da org |
| POST | `/auth/register` | Registrar usuário (admin) |
| GET | `/auth/users` | Listar usuários da org |
| PUT | `/auth/users/{id}` | Editar nome/role (admin) |
| PUT | `/auth/alterar-senha` | Alterar própria senha |
| GET | `/auth/users/{id}/stats` | Stats de tickets do user |
| GET | `/auth/tecnicos` | Listar técnicos |
| GET | `/auth/organizacao` | Dados da org |

### Chamados
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/chamados/` | Listar (filtra por org + role) |
| POST | `/chamados/` | Criar chamado |
| DELETE | `/chamados/{id}` | Deletar |
| POST | `/chamados/{id}/atribuir` | Atribuir técnico |
| POST | `/chamados/{id}/finalizar` | Finalizar |
| PUT | `/chamados/{id}/editar` | Editar (usuário dono) |
| GET | `/chamados/{id}/mensagens` | Listar chat |
| POST | `/chamados/{id}/mensagens` | Enviar mensagem |

### Monitoramento
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/monitoramento` | Receber dados do agent |
| GET | `/maquinas` | Listar (filtra por org) |
| POST | `/maquinas` | Criar equipamento |
| GET | `/maquinas/download-agent` | Baixar script agent |
| GET | `/maquinas/{id}/chamados` | Histórico da máquina |

### Inventário
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/inventario` | Listar itens da org |
| POST | `/inventario` | Criar item |
| PUT | `/inventario/{id}` | Atualizar |
| DELETE | `/inventario/{id}` | Remover |

---

## 👥 Papéis de Usuário

| Funcionalidade | USUARIO | TECNICO | ADMIN |
|----------------|---------|---------|-------|
| Abrir chamados | ✅ | ✅ | ✅ |
| Chat no chamado | ✅ | ✅ | ✅ |
| Editar próprio chamado | ✅ | ❌ | ❌ |
| Atribuir técnico | ❌ | ❌ | ✅ |
| Finalizar chamado | ❌ | ✅ | ✅ |
| Inventário | ❌ | ✅ | ✅ |
| Equipamentos | ❌ | ✅ | ✅ |
| Download Agent | ❌ | ✅ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ✅ |
| Gerar QR Code | ❌ | ❌ | ✅ |
| Ver stats de usuário | ❌ | ✅ | ✅ |
| Alterar senha | ✅ | ✅ | ✅ |

---

## 🛠️ Tecnologias

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, SQLite
- **Frontend Web**: React, Axios, Recharts, qrcode.react
- **Mobile**: React Native, Expo
- **Desktop**: Electron, React
- **Agent**: Python, psutil, requests
- **Auth**: JWT (python-jose), bcrypt

---

## 📦 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | `sqlite:///./tiresolve.db` | URL do banco |
| `SECRET_KEY` | (dev key) | Chave JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Expiração do token |

---

## 📄 Licença

Projeto acadêmico — FATEC Praia Grande
