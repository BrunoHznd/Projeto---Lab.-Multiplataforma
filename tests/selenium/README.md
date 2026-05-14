# Testes Web -> Backend (Selenium)

Suíte end-to-end que **usa apenas a Web** (Selenium + Chrome) e, ao final, gera
um **relatório sobre o Backend** (`report/backend_report.md`).

## O que é coberto

Todos os fluxos abaixo passam pelo navegador (UI real) e portanto exercitam o
backend de forma indireta:

- `POST /auth/login` — login Admin e login Usuário
- `GET /auth/users` — página Usuários
- `GET /inventario` + `POST /inventario` — CRUD na nova tela de Inventário,
  validando o novo controle de **garantia por datas** (Data da compra + Fim
  da garantia) e o cálculo automático do badge "Em garantia até …"
- `GET /maquinas` — página Máquinas
- `GET /chamados` + `POST /chamados` — listagem e criação (pelo usuário comum)
- `GET /dashboard` (página) e suas chamadas auxiliares
- Logout (limpeza do token no navegador)

Setup/teardown criam, **via API**, uma organização isolada por execução
(`Org Selenium <timestamp>`) com 1 admin e 1 usuário, removida ao final.

## Pré-requisitos

- Backend e Nginx em execução (default: `http://localhost`)
- `python3` ≥ 3.10
- `journalctl` acessível (para coletar logs do backend no relatório)
- Sysadmin criado uma vez (`backend/register_sysadmin.py`). Se não existir,
  o conftest tenta criá-lo automaticamente.

## Como rodar

```bash
cd tests/selenium
./run_tests.sh
```

Opções via env:

| Variável         | Padrão                       | Descrição |
|------------------|------------------------------|-----------|
| `TIRESOLVE_URL`  | `http://localhost`           | URL base da web (sem `/`) |
| `SYSADMIN_EMAIL` | `sysadmin@tiresolve.io`      | Credenciais do SysAdmin |
| `SYSADMIN_SENHA` | `sysadmin123`                | idem |
| `HEADED`         | _(unset → headless)_         | `1` para abrir janela do Chrome |

O script instala automaticamente o Google Chrome (se faltar) e cria uma venv
local em `tests/selenium/.venv` com `selenium` + `pytest` + `requests`.

## Saídas

- `report/backend_report.md` — relatório legível com resumo, status de cada
  teste, endpoints do backend acionados e trecho dos logs do uvicorn.
- `report/backend_report.json` — mesma informação em formato estruturado.
- `report/pytest_output.log` — saída crua do pytest.

## Notas

- Os IDs/usuários gerados são únicos por execução (`RUN_ID`), permitindo
  re-rodar sem limpeza manual.
- Caso o `DELETE /sysadmin/organizacoes/{id}` falhe (por dependências), a org
  fica registrada mas com nome `Org Selenium <ts>` — fácil de identificar.
