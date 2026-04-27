# 📋 tiResolve — Atualizações & Funções

Documento completo com todas as funcionalidades, fluxos e estrutura do banco de dados.

---

## 🗄️ Banco de Dados (SQLite)

O banco utiliza **SQLAlchemy ORM** com 6 tabelas:

### Diagrama de Relacionamentos

```
┌─────────────────┐
│  organizacoes   │
│─────────────────│
│ id (PK)         │
│ nome            │
│ logo_url        │
│ codigo_acesso   │◄───── UUID 8 chars (ex: "A1B2C3D4")
│ created_at      │
└────────┬────────┘
         │ 1:N
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
    ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ users  │ │chamados│ │maquinas│ │inventario│
└────────┘ └────────┘ └────────┘ └──────────┘
```

### Tabela: `organizacoes`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `nome` | VARCHAR(255) | Nome da empresa |
| `logo_url` | VARCHAR(500) | URL do logo (upload) |
| `codigo_acesso` | VARCHAR(36) UNIQUE | Código para cadastro (8 chars UUID) |
| `created_at` | DATETIME | Data de criação |

**Relacionamentos:** 1:N com `users`, `chamados`, `maquinas`, `inventario`

---

### Tabela: `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `nome` | VARCHAR(255) | Nome completo |
| `email` | VARCHAR(255) UNIQUE | Email (login) |
| `senha_hash` | VARCHAR(255) | Hash bcrypt da senha |
| `role` | ENUM(ADMIN, TECNICO, USUARIO) | Papel no sistema |
| `organizacao_id` | INTEGER FK → organizacoes.id | Organização vinculada |
| `created_at` | DATETIME | Data de cadastro |

**Relacionamentos:**
- N:1 com `organizacoes`
- 1:N com `chamados` (como `usuario_id` → quem abriu)
- 1:N com `chamados` (como `tecnico_id` → quem atende)hj
- 1:N com `logs_chamado` (como `autor_id`)

---

### Tabela: `chamados`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `titulo` | VARCHAR(500) | Título do chamado |
| `descricao` | TEXT | Descrição detalhada |
| `imagem_url` | VARCHAR(500) | Foto do problema (opcional) |
| `status` | ENUM(ABERTO, EM_ATENDIMENTO, FINALIZADO) | Status atual |
| `prioridade` | ENUM(BAIXA, MEDIA, ALTA, CRITICA) | Nível de urgência |
| `usuario_id` | INTEGER FK → users.id | Quem abriu |
| `tecnico_id` | INTEGER FK → users.id | Técnico atribuído |
| `maquina_id` | INTEGER FK → maquinas.id | Equipamento associado |
| `organizacao_id` | INTEGER FK → organizacoes.id | Organização |
| `resolucao` | TEXT | O que foi feito (ao finalizar) |
| `resolucao_imagem_url` | VARCHAR(500) | Foto da resolução |
| `created_at` | DATETIME | Abertura |
| `updated_at` | DATETIME | Última atualização |
| `finalizado_at` | DATETIME | Data de finalização |

**Relacionamentos:** N:1 com `users` (usuario + tecnico), N:1 com `maquinas`, 1:N com `logs_chamado`

---

### Tabela: `logs_chamado` (Chat + Histórico)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `chamado_id` | INTEGER FK → chamados.id | Chamado associado |
| `autor_id` | INTEGER FK → users.id | Quem enviou a mensagem |
| `mensagem` | TEXT | Conteúdo da mensagem |
| `imagem_url` | VARCHAR(500) | Imagem anexa |
| `created_at` | DATETIME | Data de envio |

> ⚠️ Esta tabela é usada tanto como **chat** (mensagens entre partes) quanto como **log de edições** (prefixo `[Editado]`).

---

### Tabela: `maquinas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `nome` | VARCHAR(255) | Hostname da máquina |
| `ip` | VARCHAR(45) | IP na rede |
| `localizacao` | VARCHAR(255) | Localização física |
| `ultimo_status` | ENUM(ONLINE, OFFLINE) | Última situação |
| `cpu_uso` | FLOAT | % CPU (última leitura) |
| `memoria_uso` | FLOAT | % Memória (última leitura) |
| `ultima_verificacao` | DATETIME | Timestamp do agent |
| `organizacao_id` | INTEGER FK → organizacoes.id | Organização |

---

### Tabela: `inventario`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | ID auto-incremento |
| `organizacao_id` | INTEGER FK → organizacoes.id | Organização |
| `nome` | VARCHAR(255) | Nome do equipamento |
| `descricao` | TEXT | Descrição |
| `foto_url` | VARCHAR(500) | Foto do item |
| `garantia` | BOOLEAN | Possui garantia? |
| `garantia_ate` | DATETIME | Data de expiração |
| `campos_extras` | JSON | Campos dinâmicos `{"Marca": "Dell", "RAM": "16GB"}` |
| `created_at` | DATETIME | Data de adição |
| `updated_at` | DATETIME | Última atualização |

> 💡 O campo `campos_extras` (JSON) permite adicionar quantos campos quiser sem alterar o banco.

---

## 🔧 Funcionalidades Principais

### 1. Multi-Tenancy (Organizações)

**Como funciona:**
- Cada empresa/organização recebe um **código de acesso** único (8 caracteres)
- Todos os dados (users, chamados, máquinas, inventário) são filtrados por `organizacao_id`
- Nenhuma organização vê dados de outra

**Fluxo de criação:**
```
Usuário → "Sou Novo Na Plataforma"
       → Nome da empresa + Email + Senha
       → API cria Organizacao + User ADMIN
       → Retorna token → Entra direto
```

**Fluxo de cadastro com ID:**
```
Usuário → "Cadastrar com ID"
       → Insere código (8 chars) + Email + Senha
       → API busca org pelo código
       → Cria user USUARIO vinculado à org
```

---

### 2. Sistema de Chamados

**Fluxo completo:**
```
USUARIO abre chamado → Status: ABERTO
ADMIN atribui técnico → Status: EM_ATENDIMENTO
TECNICO resolve → Status: FINALIZADO (com resolução + foto)
```

**Chat:**
- Dentro de cada chamado, há um chat estilo WhatsApp
- Mensagens ficam na tabela `logs_chamado`
- Quem pode enviar: usuario dono, técnico atribuído, admin
- Mensagens de edição aparecem com prefixo `[Editado]` em amarelo

**Edição pelo usuário:**
- USUARIO pode editar título e descrição do próprio chamado
- Cada alteração gera um log automático:
  `[Editado] Titulo alterado de "X" para "Y"`

---

### 3. Monitoramento (Agent)

**Como funciona:**
1. Na página Máquinas, ADMIN/TECNICO clica "⬇️ Baixar Agent"
2. O backend gera um script Python com o `CODIGO_ORGANIZACAO` embutido
3. O script roda na máquina, coleta CPU/RAM/Ping a cada 60 segundos
4. Envia para `POST /monitoramento` com o código da org
5. Backend cria/atualiza a máquina na tabela `maquinas` vinculada à org
6. **Automaticamente cria um item no Inventário** se a máquina for nova

**Dados coletados:** CPU %, Memória %, Status (ONLINE/OFFLINE), IP, Hostname

---

### 4. Inventário

**Funcionalidades:**
- CRUD completo (criar, ver, editar, deletar)
- Upload de foto do equipamento
- Controle de garantia (Sim/Não + data "Até quando")
- **Campos extras dinâmicos** — adicione quantos quiser (chave/valor), armazenados como JSON
- Itens criados automaticamente pelo Agent vêm com `Origem: Agent`
- Clique no nome do item → abre modal com todas as informações

**Acesso:** Apenas ADMIN e TECNICO

---

### 5. Gestão de Usuários

**Admin pode:**
- Criar novos usuários (qualquer role)
- Editar nome e role de usuários da org
- Gerar QR Code para cadastro rápido

**QR Code:**
- Gera uma URL: `http://host/login?org=CODIGO`
- Ao escanear, o Login.js detecta o parâmetro `?org=` e vai direto para "Cadastrar com ID" com o código preenchido
- Usuário só precisa inserir email e senha

**Stats de Tickets:**
- ADMIN/TECNICO clica no 📊 de um USUARIO
- Vê: Total de chamados, Abertos, Finalizados

**Alterar Senha:**
- Qualquer usuário pode alterar a própria senha
- Precisa informar senha atual + nova senha + confirmação

---

### 6. Download do Agent

**Fluxo:**
```
ADMIN/TECNICO → Página Máquinas → "⬇️ Baixar Agent"
→ Backend gera script Python com:
   - CODIGO_ORGANIZACAO = "A1B2C3D4"
   - API_URL = "http://SEU_IP:8000/monitoramento"
→ Download: tiresolve_agent_A1B2C3D4.py
→ Executar na máquina: python tiresolve_agent_A1B2C3D4.py
```

O agent precisa de: `pip install psutil requests`

---

## 🔒 Autenticação

- **JWT** (JSON Web Token) com expiração de 8 horas
- **bcrypt** para hash de senhas
- Token retornado no login com dados do user + org
- Frontend salva no `localStorage`:
  - `tiresolve_token` — JWT
  - `tiresolve_user` — dados do usuário
  - `tiresolve_org` — dados da organização

---

## 📊 Resumo de Arquivos Principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `models/__init__.py` | 6 tabelas SQLAlchemy |
| `schemas/__init__.py` | 20+ schemas Pydantic |
| `routers/auth.py` | Login, registro, org, editar user, senha, stats |
| `routers/chamados.py` | CRUD chamados + chat + edição |
| `routers/monitoramento.py` | Agent + máquinas + download agent |
| `routers/inventario.py` | CRUD inventário |
| `services/auth_service.py` | JWT + bcrypt |
| `services/chamado_service.py` | Lógica de chamados (filtra por org) |
| `services/monitoramento_service.py` | Lógica do agent (auto-inventário) |
| `migrate.py` | Criação e migração do banco |
| `api.js` | Todas as chamadas API (Axios) |
| `Login.js` | 3 modos de acesso |
| `Chamados.js` | Chamados + chat + edição |
| `Maquinas.js` | Equipamentos + download agent |
| `Inventario.js` | Inventário + detalhes |
| `Usuarios.js` | Gestão + QR Code + stats + senha |
