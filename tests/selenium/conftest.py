"""
Fixtures + coletor de resultados para o relatorio do backend.

- Cria, via API, uma organizacao isolada com 1 ADMIN e 1 USUARIO (USR) para
  os testes. Tudo o que e' funcional e' validado pela WEB (Selenium).
- Coleta status de cada teste (PASS/FAIL/SKIP), duracao e endpoints chamados
  no backend (sniff dos logs do uvicorn via journalctl) e ao final gera
  `report/backend_report.md`.
"""
import os
import time
import json
import uuid
import subprocess
import datetime as dt
from pathlib import Path

import pytest
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait


# ===================== Config =====================

BASE_URL = os.environ.get("TIRESOLVE_URL", "http://localhost").rstrip("/")
API_URL = f"{BASE_URL}/api"

SYSADMIN_EMAIL = os.environ.get("SYSADMIN_EMAIL", "sysadmin@tiresolve.io")
SYSADMIN_SENHA = os.environ.get("SYSADMIN_SENHA", "sysadmin123")

# Identificador unico desta execucao (evita colisoes em re-runs)
RUN_ID = dt.datetime.now().strftime("%Y%m%d%H%M%S")
ORG_NAME = f"Org Selenium {RUN_ID}"
ADMIN_EMAIL = f"selenium_admin_{RUN_ID}@ti.test"
ADMIN_SENHA = "Admin@123"
USER_EMAIL = f"selenium_user_{RUN_ID}@ti.test"
USER_SENHA = "User@123"

REPORT_DIR = Path(__file__).parent / "report"
REPORT_DIR.mkdir(exist_ok=True)


# ===================== Coletor de resultados =====================

class TestCollector:
    def __init__(self):
        self.records = []
        self.session_started_at = dt.datetime.now()

    def add(self, nodeid, outcome, duration, longrepr=None):
        self.records.append({
            "nodeid": nodeid,
            "outcome": outcome,
            "duration": round(duration, 3),
            "longrepr": str(longrepr) if longrepr else "",
        })


collector = TestCollector()


def pytest_runtest_logreport(report):
    if report.when == "call" or (report.when == "setup" and report.outcome != "passed"):
        collector.add(
            nodeid=report.nodeid,
            outcome=report.outcome.upper(),
            duration=report.duration,
            longrepr=getattr(report, "longrepr", None),
        )


# ===================== API helpers (setup/teardown) =====================

def _api_login(email, senha):
    r = requests.post(f"{API_URL}/auth/login", json={"email": email, "senha": senha}, timeout=10)
    r.raise_for_status()
    return r.json()


def _ensure_sysadmin():
    """Garante que o SysAdmin existe (chama o script local)."""
    try:
        _api_login(SYSADMIN_EMAIL, SYSADMIN_SENHA)
        return
    except Exception:
        pass
    backend_dir = Path(__file__).resolve().parents[2] / "backend"
    venv_python = backend_dir / "venv" / "bin" / "python3"
    python = str(venv_python) if venv_python.exists() else "python3"
    subprocess.run(
        [python, "register_sysadmin.py",
         "--email", SYSADMIN_EMAIL, "--senha", SYSADMIN_SENHA, "--nome", "SysAdmin"],
        cwd=str(backend_dir), check=True
    )


def _create_org_admin():
    """Sysadmin cria nova organizacao com admin -> retorna codigo_acesso."""
    token = _api_login(SYSADMIN_EMAIL, SYSADMIN_SENHA)["access_token"]
    r = requests.post(
        f"{API_URL}/sysadmin/organizacoes",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nome_empresa": ORG_NAME,
            "email_admin": ADMIN_EMAIL,
            "senha_admin": ADMIN_SENHA,
            "nome_admin": "Admin Selenium",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def _create_usuario_comum(codigo_org):
    r = requests.post(
        f"{API_URL}/auth/registrar-com-id",
        json={
            "nome": "Usuario Selenium",
            "email": USER_EMAIL,
            "senha": USER_SENHA,
            "codigo_organizacao": codigo_org,
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def _delete_org(org_id):
    try:
        token = _api_login(SYSADMIN_EMAIL, SYSADMIN_SENHA)["access_token"]
        requests.delete(
            f"{API_URL}/sysadmin/organizacoes/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except Exception as e:
        print(f"[warn] falha ao remover org de teste: {e}")


# ===================== Fixtures =====================

@pytest.fixture(scope="session")
def credenciais():
    """Prepara a organizacao + admin + usuario via API (setup)."""
    _ensure_sysadmin()
    org = _create_org_admin()
    _create_usuario_comum(org["codigo_acesso"])
    info = {
        "org_id": org["id"],
        "org_nome": org["nome"],
        "codigo_acesso": org["codigo_acesso"],
        "admin_email": ADMIN_EMAIL,
        "admin_senha": ADMIN_SENHA,
        "user_email": USER_EMAIL,
        "user_senha": USER_SENHA,
        "base_url": BASE_URL,
        "api_url": API_URL,
    }
    yield info
    _delete_org(org["id"])


@pytest.fixture(scope="session")
def journal_since():
    """Marca timestamp p/ capturar logs do backend ao final."""
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@pytest.fixture(scope="session")
def driver():
    opts = Options()
    if os.environ.get("HEADED") != "1":
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1400,900")
    opts.add_argument("--lang=pt-BR")
    d = webdriver.Chrome(options=opts)
    d.implicitly_wait(2)
    yield d
    d.quit()


@pytest.fixture
def wait(driver):
    return WebDriverWait(driver, 15)


# ===================== Coleta logs do backend e gera relatorio =====================

def _collect_backend_logs(since):
    """Captura linhas de log do uvicorn (systemd) desde o timestamp informado."""
    try:
        out = subprocess.check_output(
            ["journalctl", "-u", "tiresolve-backend", "--since", since, "--no-pager", "-o", "cat"],
            stderr=subprocess.STDOUT, timeout=10
        ).decode("utf-8", errors="ignore")
        return out
    except Exception as e:
        return f"[falha ao ler journalctl: {e}]"


def _parse_endpoints(log_text):
    """Conta os endpoints chamados a partir das linhas do uvicorn."""
    import re
    pattern = re.compile(r'"(GET|POST|PUT|DELETE|PATCH) (\S+) HTTP/[^"]+" (\d+)')
    counts = {}
    for m in pattern.finditer(log_text):
        method, path, status = m.group(1), m.group(2), m.group(3)
        # normaliza ids numericos
        norm = re.sub(r"/\d+", "/{id}", path.split("?")[0])
        key = f"{method} {norm}"
        counts.setdefault(key, {"total": 0, "ok": 0, "fail": 0})
        counts[key]["total"] += 1
        if status.startswith("2") or status.startswith("3"):
            counts[key]["ok"] += 1
        else:
            counts[key]["fail"] += 1
    return counts


def pytest_sessionfinish(session, exitstatus):
    # Recupera o journal_since da fixture (se rodou)
    since = collector.session_started_at.strftime("%Y-%m-%d %H:%M:%S")
    logs = _collect_backend_logs(since)
    endpoints = _parse_endpoints(logs)

    total = len(collector.records)
    passed = sum(1 for r in collector.records if r["outcome"] == "PASSED")
    failed = sum(1 for r in collector.records if r["outcome"] == "FAILED")
    skipped = sum(1 for r in collector.records if r["outcome"] == "SKIPPED")
    duracao = sum(r["duration"] for r in collector.records)

    lines = []
    lines.append(f"# Relatorio de Testes Web -> Backend (tiResolve)")
    lines.append("")
    lines.append(f"- **Data**: {dt.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    lines.append(f"- **URL alvo**: {BASE_URL}")
    lines.append(f"- **Run ID**: {RUN_ID}")
    lines.append(f"- **Modo**: {'HEADED' if os.environ.get('HEADED') == '1' else 'HEADLESS'} (Selenium / Chrome)")
    lines.append("")
    lines.append("## Resumo")
    lines.append("")
    lines.append(f"| Total | Passou | Falhou | Skipped | Duracao |")
    lines.append(f"|------:|------:|------:|------:|------:|")
    lines.append(f"| {total} | {passed} | {failed} | {skipped} | {duracao:.2f}s |")
    lines.append("")
    lines.append("## Resultado por caso de teste")
    lines.append("")
    lines.append("| # | Teste | Status | Tempo (s) |")
    lines.append("|--:|-------|:------:|----------:|")
    for i, r in enumerate(collector.records, 1):
        nice = r["nodeid"].split("::")[-1]
        emoji = {"PASSED": "PASS", "FAILED": "FAIL", "SKIPPED": "SKIP"}.get(r["outcome"], r["outcome"])
        lines.append(f"| {i} | `{nice}` | **{emoji}** | {r['duration']:.2f} |")
    lines.append("")

    # Detalhamento "O que foi testado / Como / Endpoints" por caso
    try:
        from test_web_backend import CASOS  # type: ignore
    except Exception:
        CASOS = {}
    lines.append("## Detalhamento dos testes (o que e como)")
    lines.append("")
    for i, r in enumerate(collector.records, 1):
        nice = r["nodeid"].split("::")[-1]
        meta = CASOS.get(nice, {})
        lines.append(f"### {i}. `{nice}` — **{r['outcome']}** ({r['duration']:.2f}s)")
        lines.append("")
        if meta:
            lines.append(f"- **O que e testado**: {meta.get('descricao', '-')}")
            lines.append(f"- **Como (passos na WEB)**: {meta.get('como', '-')}")
            eps = meta.get("endpoints") or []
            if eps:
                lines.append("- **Endpoints do backend exercitados**:")
                for ep in eps:
                    lines.append(f"  - `{ep}`")
            vals = meta.get("validacoes") or []
            if vals:
                lines.append("- **Validacoes (asserts)**:")
                for v in vals:
                    lines.append(f"  - {v}")
        else:
            lines.append("_(sem metadados no catalogo CASOS)_")
        lines.append("")

    if any(r["outcome"] == "FAILED" for r in collector.records):
        lines.append("## Falhas (resumo)")
        lines.append("")
        for r in collector.records:
            if r["outcome"] == "FAILED":
                lines.append(f"### `{r['nodeid']}`")
                lines.append("")
                lines.append("```")
                lines.append(r["longrepr"][:2000])
                lines.append("```")
                lines.append("")

    lines.append("## Endpoints do backend acionados durante a sessao")
    lines.append("")
    if endpoints:
        lines.append("| Endpoint | Total | 2xx/3xx | Erros |")
        lines.append("|----------|------:|--------:|------:|")
        for key in sorted(endpoints.keys()):
            v = endpoints[key]
            lines.append(f"| `{key}` | {v['total']} | {v['ok']} | {v['fail']} |")
    else:
        lines.append("_Sem logs do backend disponiveis (journalctl pode requerer permissao)._ ")
    lines.append("")

    lines.append("## Cobertura por modulo do backend")
    lines.append("")
    modulos = {
        "Autenticacao (/auth)": [k for k in endpoints if "/auth" in k],
        "Inventario (/inventario)": [k for k in endpoints if "/inventario" in k],
        "Chamados (/chamados)": [k for k in endpoints if "/chamados" in k],
        "Maquinas (/maquinas)": [k for k in endpoints if "/maquinas" in k],
        "Sysadmin (/sysadmin)": [k for k in endpoints if "/sysadmin" in k],
        "Upload (/upload)": [k for k in endpoints if "/upload" in k],
        "Notificacoes (/notif)": [k for k in endpoints if "/notif" in k or "/notificacoes" in k],
    }
    for nome, lst in modulos.items():
        status = "OK" if lst else "nao exercitado"
        lines.append(f"- **{nome}**: {status} ({len(lst)} endpoint(s))")
    lines.append("")

    lines.append("## Trecho dos logs do backend")
    lines.append("")
    lines.append("```")
    # so as ultimas linhas pra nao ficar enorme
    tail = "\n".join(logs.splitlines()[-80:])
    lines.append(tail or "(vazio)")
    lines.append("```")

    out_md = REPORT_DIR / "backend_report.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")

    # Tambem grava JSON estruturado
    (REPORT_DIR / "backend_report.json").write_text(json.dumps({
        "run_id": RUN_ID,
        "base_url": BASE_URL,
        "summary": {"total": total, "passed": passed, "failed": failed, "skipped": skipped, "duration_s": duracao},
        "tests": collector.records,
        "endpoints": endpoints,
    }, indent=2), encoding="utf-8")

    # Contexto compartilhado para PDF/DOCX
    ctx = {
        "data": dt.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "base_url": BASE_URL,
        "run_id": RUN_ID,
        "modo": "HEADED" if os.environ.get("HEADED") == "1" else "HEADLESS",
        "summary": {
            "total": total, "passed": passed, "failed": failed,
            "skipped": skipped, "duration_s": duracao,
        },
        "tests": collector.records,
        "endpoints": endpoints,
        "modulos": modulos,
        "casos": CASOS,
    }
    extras = []
    try:
        from report_writers import write_pdf, write_docx
        out_pdf = REPORT_DIR / "backend_report.pdf"
        write_pdf(ctx, out_pdf)
        extras.append(str(out_pdf))
    except Exception as e:
        print(f"[warn] Falha ao gerar PDF: {e}")
    try:
        from report_writers import write_docx as _docx
        out_docx = REPORT_DIR / "backend_report.docx"
        _docx(ctx, out_docx)
        extras.append(str(out_docx))
    except Exception as e:
        print(f"[warn] Falha ao gerar DOCX: {e}")

    print(f"\n>>> Relatorio gerado em: {out_md}")
    for p in extras:
        print(f">>> Tambem em: {p}")
