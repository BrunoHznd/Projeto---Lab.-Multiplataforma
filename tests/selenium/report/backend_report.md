# Relatorio de Testes Web -> Backend (tiResolve)

- **Data**: 11/05/2026 19:14:19
- **URL alvo**: http://localhost
- **Run ID**: 20260511191220
- **Modo**: HEADLESS (Selenium / Chrome)

## Resumo

| Total | Passou | Falhou | Skipped | Duracao |
|------:|------:|------:|------:|------:|
| 8 | 8 | 0 | 0 | 35.68s |

## Resultado por caso de teste

| # | Teste | Status | Tempo (s) |
|--:|-------|:------:|----------:|
| 1 | `test_admin_login_via_ui` | **PASS** | 8.62 |
| 2 | `test_admin_dashboard_carrega` | **PASS** | 0.55 |
| 3 | `test_admin_navega_inventario` | **PASS** | 3.72 |
| 4 | `test_admin_cria_item_inventario_com_garantia` | **PASS** | 11.26 |
| 5 | `test_admin_lista_usuarios` | **PASS** | 3.22 |
| 6 | `test_admin_lista_maquinas` | **PASS** | 2.50 |
| 7 | `test_admin_lista_chamados` | **PASS** | 3.53 |
| 8 | `test_admin_logout` | **PASS** | 2.27 |

## Detalhamento dos testes (o que e como)

### 1. `test_admin_login_via_ui` — **PASSED** (8.62s)

- **O que e testado**: Valida autenticacao do usuario ADMIN pela tela /login.
- **Como (passos na WEB)**: Abre /login, preenche e-mail e senha do admin recem-criado, submete o formulario e aguarda redirecionamento para /dashboard.
- **Endpoints do backend exercitados**:
  - `POST /auth/login -> 200 + JWT no localStorage`
- **Validacoes (asserts)**:
  - URL sai de /login
  - URL termina em /dashboard (rota default do ADMIN)

### 2. `test_admin_dashboard_carrega` — **PASSED** (0.55s)

- **O que e testado**: Garante que /dashboard renderiza apos login.
- **Como (passos na WEB)**: Aguarda o seletor .page-title aparecer na pagina apos o redirecionamento do login.
- **Endpoints do backend exercitados**:
  - `GET /chamados/ -> 200 (cards/contadores)`
  - `GET /maquinas -> 200 (cards de infraestrutura)`
- **Validacoes (asserts)**:
  - Elemento .page-title presente

### 3. `test_admin_navega_inventario` — **PASSED** (3.72s)

- **O que e testado**: Acessa a tela de Inventario via sidebar e confirma listagem.
- **Como (passos na WEB)**: Clica no link da sidebar com href=/inventario e espera a tabela carregar; verifica que o botao 'Novo Item' esta visivel.
- **Endpoints do backend exercitados**:
  - `GET /inventario -> 200 (lista paginada da organizacao)`
- **Validacoes (asserts)**:
  - .table-container renderizou
  - Botao 'Novo Item' visivel para ADMIN

### 4. `test_admin_cria_item_inventario_com_garantia` — **PASSED** (11.26s)

- **O que e testado**: Valida o NOVO controle de garantia (Data da compra + Fim da garantia) e a exibicao automatica de 'Em garantia ate DD/MM/AAAA' sem deslocamento de fuso (sem dia -1).
- **Como (passos na WEB)**: Abre o modal 'Novo Item', preenche nome unico; define data_compra = hoje e garantia_ate = hoje + 1 ano via JS (compatibilidade com input type=date); confere o aviso em tempo real dentro do modal; salva e localiza a linha na tabela.
- **Endpoints do backend exercitados**:
  - `POST /inventario -> 201 (cria o item)`
  - `GET /inventario -> 200 (refresh apos salvar)`
- **Validacoes (asserts)**:
  - Modal exibe 'Em garantia ate DD/MM/AAAA' com a data EXATA digitada
  - Modal fecha apos salvar
  - Tabela contem nova linha com o nome do item
  - Badge da linha mostra 'Ate DD/MM/AAAA' (sem dia -1)

### 5. `test_admin_lista_usuarios` — **PASSED** (3.22s)

- **O que e testado**: Confirma que a pagina /usuarios lista os usuarios da org.
- **Como (passos na WEB)**: Clica em /usuarios na sidebar e aguarda a <table> renderizar.
- **Endpoints do backend exercitados**:
  - `GET /auth/users -> 200 (usuarios da organizacao do admin)`
- **Validacoes (asserts)**:
  - Tabela renderizou
  - Usuario USR de teste aparece no body da pagina

### 6. `test_admin_lista_maquinas` — **PASSED** (2.50s)

- **O que e testado**: Garante que a tela de Maquinas carrega sem erro.
- **Como (passos na WEB)**: Clica em /maquinas na sidebar e aguarda .page-title.
- **Endpoints do backend exercitados**:
  - `GET /maquinas -> 200`
  - `GET /grupos -> 200`
- **Validacoes (asserts)**:
  - Elemento .page-title visivel

### 7. `test_admin_lista_chamados` — **PASSED** (3.53s)

- **O que e testado**: Confirma que /chamados carrega para o ADMIN.
- **Como (passos na WEB)**: Clica em /chamados na sidebar e aguarda .page-title.
- **Endpoints do backend exercitados**:
  - `GET /chamados/ -> 200`
  - `GET /chamados/tecnicos -> 200 (lista de tecnicos para atribuicao)`
- **Validacoes (asserts)**:
  - Elemento .page-title visivel

### 8. `test_admin_logout` — **PASSED** (2.27s)

- **O que e testado**: Logout limpa sessao e volta para /login.
- **Como (passos na WEB)**: Clica no botao .sidebar-logout e aguarda URL conter /login.
- **Endpoints do backend exercitados**:
  - `(nenhum endpoint do backend - logout e cliente, drop do JWT)`
- **Validacoes (asserts)**:
  - URL contem /login apos clique

## Endpoints do backend acionados durante a sessao

| Endpoint | Total | 2xx/3xx | Erros |
|----------|------:|--------:|------:|
| `GET /auth/users` | 1 | 1 | 0 |
| `GET /chamados/` | 3 | 3 | 0 |
| `GET /chamados/tecnicos` | 1 | 1 | 0 |
| `GET /grupos` | 1 | 1 | 0 |
| `GET /inventario` | 2 | 2 | 0 |
| `GET /maquinas` | 4 | 4 | 0 |
| `GET /ws/chamados` | 10 | 0 | 10 |
| `POST /auth/login` | 4 | 4 | 0 |
| `POST /auth/registrar-com-id` | 1 | 1 | 0 |
| `POST /chamados/` | 1 | 1 | 0 |
| `POST /inventario` | 1 | 1 | 0 |
| `POST /sysadmin/organizacoes` | 1 | 1 | 0 |

## Cobertura por modulo do backend

- **Autenticacao (/auth)**: OK (3 endpoint(s))
- **Inventario (/inventario)**: OK (2 endpoint(s))
- **Chamados (/chamados)**: OK (4 endpoint(s))
- **Maquinas (/maquinas)**: OK (1 endpoint(s))
- **Sysadmin (/sysadmin)**: OK (1 endpoint(s))
- **Upload (/upload)**: nao exercitado (0 endpoint(s))
- **Notificacoes (/notif)**: nao exercitado (0 endpoint(s))

## Trecho dos logs do backend

```
INFO:     None:0 - "POST /auth/login HTTP/1.0" 200 OK
INFO:     None:0 - "POST /auth/login HTTP/1.0" 200 OK
INFO:     None:0 - "POST /sysadmin/organizacoes HTTP/1.0" 201 Created
INFO:     None:0 - "POST /auth/registrar-com-id HTTP/1.0" 201 Created
INFO:     None:0 - "POST /auth/login HTTP/1.0" 200 OK
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNSIsInJvbGUiOiJBRE1JTiIsImV4cCI6MTc3ODU2NjM1NX0.Kj1NpZ9H1ZfMMhbRNziqIyKIqR8I40LnwGB3p4j1xoU HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /chamados/ HTTP/1.0" 200 OK
INFO:     None:0 - "GET /maquinas HTTP/1.0" 200 OK
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNSIsInJvbGUiOiJBRE1JTiIsImV4cCI6MTc3ODU2NjM1NX0.Kj1NpZ9H1ZfMMhbRNziqIyKIqR8I40LnwGB3p4j1xoU HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /inventario HTTP/1.0" 200 OK
INFO:     None:0 - "POST /inventario HTTP/1.0" 201 Created
INFO:     None:0 - "GET /inventario HTTP/1.0" 200 OK
INFO:     None:0 - "GET /auth/users HTTP/1.0" 200 OK
INFO:     None:0 - "GET /grupos HTTP/1.0" 200 OK
INFO:     None:0 - "GET /maquinas?tipo=HARDWARE HTTP/1.0" 200 OK
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNSIsInJvbGUiOiJBRE1JTiIsImV4cCI6MTc3ODU2NjM1NX0.Kj1NpZ9H1ZfMMhbRNziqIyKIqR8I40LnwGB3p4j1xoU HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /chamados/ HTTP/1.0" 200 OK
INFO:     None:0 - "GET /chamados/tecnicos HTTP/1.0" 200 OK
INFO:     None:0 - "GET /maquinas?tipo=HARDWARE HTTP/1.0" 200 OK
INFO:     None:0 - "POST /auth/login HTTP/1.0" 200 OK
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /chamados/ HTTP/1.0" 200 OK
INFO:     None:0 - "GET /maquinas?tipo=HARDWARE HTTP/1.0" 200 OK
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/lib/python3.12/site-packages/sklearn/base.py:463: InconsistentVersionWarning: Trying to unpickle estimator LogisticRegression from version 1.6.1 when using version 1.8.0. This might lead to breaking code or invalid results. Use at your own risk. For more info please refer to:
https://scikit-learn.org/stable/model_persistence.html#security-maintainability-limitations
  warnings.warn(
/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/lib/python3.12/site-packages/sklearn/base.py:463: InconsistentVersionWarning: Trying to unpickle estimator TfidfTransformer from version 1.6.1 when using version 1.8.0. This might lead to breaking code or invalid results. Use at your own risk. For more info please refer to:
https://scikit-learn.org/stable/model_persistence.html#security-maintainability-limitations
  warnings.warn(
/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/lib/python3.12/site-packages/sklearn/base.py:463: InconsistentVersionWarning: Trying to unpickle estimator TfidfVectorizer from version 1.6.1 when using version 1.8.0. This might lead to breaking code or invalid results. Use at your own risk. For more info please refer to:
https://scikit-learn.org/stable/model_persistence.html#security-maintainability-limitations
  warnings.warn(
[ML] Falha ao carregar /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/MachineLearning/classificador_tickets_spacy_tfidf.pkl: Can't get attribute 'prever' on <module '__main__' from '/root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/backend/venv/bin/uvicorn'>
[ML] Nenhum modelo .pkl encontrado, usando fallback por regras.
INFO:     None:0 - "POST /chamados/ HTTP/1.0" 201 Created
INFO:     None:0 - "GET /ws/chamados?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNiIsInJvbGUiOiJVU1VBUklPIiwiZXhwIjoxNzc4NTY2Mzk5fQ.8qCSTZgEu5AqC_9d0Wtm7-f8mYR5bHGuNmMi2AE6ABs HTTP/1.0" 404 Not Found
```