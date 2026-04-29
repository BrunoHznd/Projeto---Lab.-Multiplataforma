"""
tiResolve - Servico de ML para classificacao de chamados.

Estrategia:
1. Tenta carregar o modelo treinado no notebook
   `MachineLearning/classificaçãoTickets.ipynb` (arquivo
   `classificador_tickets_spacy_tfidf.pkl`).
2. Se nao conseguir (faltam deps spacy/sklearn ou pkl ausente),
   usa um classificador por regras de palavras-chave (mesmas
   regras hibridas do notebook + lexico ampliado), garantindo
   que o sistema sempre classifica.

Categorias retornadas (uppercase): HARDWARE, EMAIL, IMPRESSORA,
SERVIDOR, SOFTWARE, REDES, ACESSO, SEGURANCA, OUTROS.
"""

from __future__ import annotations

import os
import re
import sys
import unicodedata
from typing import Optional

from app.models import Categoria

# ==================== Carregamento do modelo .pkl ====================

_PKL_PATH_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "..", "..",
                 "MachineLearning", "classificador_tickets_spacy_tfidf.pkl"),
    os.path.join(os.path.dirname(__file__), "..", "..",
                 "classificador_tickets_spacy_tfidf.pkl"),
]

_modelo_ml = None  # callable: texto -> str categoria


def _limpar_notebook(texto: str) -> str:
    """Replicacao exata da funcao `limpar` do notebook, necessaria para
    desserializar o .pkl (que foi salvo com referencias a __main__.limpar)."""
    try:
        from unidecode import unidecode as _ud
    except ImportError:
        _ud = lambda s: s  # noqa: E731
    texto = str(texto).lower()
    texto = texto.replace("não", "nao")
    texto = _ud(texto)
    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def _try_load_modelo() -> None:
    global _modelo_ml
    if _modelo_ml is not None:
        return

    # Requer joblib
    try:
        import joblib
        import numpy as np
    except ImportError:
        print("[ML] joblib/numpy ausente, usando fallback por regras.")
        return

    # Requer spacy com o modelo pt_core_news_md
    try:
        import spacy as _spacy
        _nlp = _spacy.load("pt_core_news_md")
    except Exception as e:
        print(f"[ML] spacy/pt_core_news_md indisponivel ({e}), usando fallback por regras.")
        return

    # Injeta `limpar` no __main__ para que o pkl desserialize sem erro
    _main = sys.modules.get("__main__")
    if _main is not None:
        _main.limpar = _limpar_notebook

    for path in _PKL_PATH_CANDIDATES:
        full = os.path.abspath(path)
        if not os.path.exists(full):
            continue
        try:
            dados = joblib.load(full)
            _tfidf = dados["tfidf"]
            _model = dados["model"]

            def _prever(texto: str) -> str:
                """Reconstroi a previsao usando tfidf + spacy (sem depender
                das funcoes do notebook que foram salvas no pkl)."""
                tc = _limpar_notebook(texto)
                x_tfidf = _tfidf.transform([tc]).toarray()
                x_spacy = np.array([_nlp(tc).vector])
                x_final = np.hstack([x_tfidf, x_spacy])
                return _model.predict(x_final)[0]

            _modelo_ml = _prever
            print(f"[ML] Modelo pkl carregado de {full}")
            return
        except Exception as e:
            print(f"[ML] Falha ao carregar {full}: {e}")

    print("[ML] Nenhum modelo .pkl encontrado, usando fallback por regras.")


# ==================== Fallback por regras ====================

def _normaliza(texto: str) -> str:
    texto = (texto or "").lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


# Lista ordenada de prioridade (rules mais especificas primeiro).
# Importante: categorias mais especificas vem antes das mais genericas
# (ex: IMPRESSORA antes de HARDWARE, EMAIL antes de SOFTWARE).
_REGRAS = [
    # SEGURANCA primeiro (sobrepoe outros termos)
    (Categoria.SEGURANCA, [
        "malware", "virus", "phishing", "ransomware", "hack", "hacker",
        "invasao", "invadiram", "spyware", "trojan", "cavalo de troia",
        "vazamento de dados", "vazou dados", "antivirus", "anti virus",
        "criptografou", "sequestro", "fraude", "ataque",
    ]),
    (Categoria.IMPRESSORA, [
        "impressora", "impressao", "imprimir", "imprime", "spooler",
        "toner", "cartucho", "scanner", "escaneando", "multifuncional",
        "papel atolado", "atolou papel",
    ]),
    (Categoria.EMAIL, [
        "email", "e mail", "e-mail", "outlook", "smtp", "imap", "pop3",
        "caixa de entrada", "caixa postal", "thunderbird", "exchange",
        "webmail", "gmail", "spam", "anexo do email", "nao recebo email",
        "nao envia email",
    ]),
    (Categoria.SERVIDOR, [
        "servidor", "server", "erro 500", "erro 502", "erro 503", "timeout",
        "iis", "apache", "nginx", "active directory", "ad ds", " ad ",
        "banco de dados", "database", "db caiu", "vmware", "hyper v",
        "hyperv", "esxi", "container", "docker", "kubernetes",
        "service down", "servico fora", "fora do ar", "host", "vm ",
    ]),
    (Categoria.REDES, [
        "wifi", "wi fi", "rede", "internet", "conexao", "vpn", "sem rede",
        "switch", "roteador", "router", " ip ", "dns", "ping", "dhcp",
        "cabo de rede", " lan", "wlan", "latencia", "pacote perdido",
        "sem sinal", "sem internet", "nao conecta", "lento internet",
        "modem", "rede caiu",
    ]),
    (Categoria.ACESSO, [
        "login", "logar", "logon", "senha", "credencial", "permissao",
        "acesso negado", "acesso bloqueado", "bloqueado", "bloqueada",
        "expirou", "expirada", "conta bloqueada", "usuario nao",
        "nao consigo entrar", "autenticacao", "sso", "mfa", "2fa",
        "duplo fator", "token", "redefinir senha", "esqueci a senha",
        "trocar senha", "permissoes",
    ]),
    (Categoria.HARDWARE, [
        # Maquina nao liga / sem video
        "nao liga", "nao da video", "sem video", "tela preta",
        "sinal de vida", "nao da sinal", "morto",
        "tela azul", "bsod", "beep", "beeps",
        # Pecas
        "monitor", "teclado", "mouse", " hd ", "ssd", "disco rigido",
        "memoria ram", " ram ", "fonte queimada", "fonte do computador",
        "placa mae", "placa de video", "gpu", "processador", "cpu",
        "cooler", "ventoinha", "gabinete", "no break", "nobreak",
        "bateria", "carregador", "headset", "fone", "webcam",
        "perifericos", "periferico", "hardware",
        # Sintomas fisicos
        "esta fazendo barulho", "superaquecendo", "superaquece",
        "esquentando muito", "queimou", "fumaca",
    ]),
    (Categoria.SOFTWARE, [
        # Termos genericos de software
        "programa", "aplicativo", "app ", "software", "sistema",
        "windows", "linux", "macos", "mac os", "ios ", "android",
        "office", "word", "excel", "powerpoint", "outlook 365",
        "navegador", "chrome", "firefox", "edge", "browser",
        "instalar", "instalacao", "reinstalar", "atualizar",
        "atualizacao", "update", "patch", "driver", "drivers",
        "erro ao abrir", "nao abre", "fecha sozinho", "trava",
        "travando", "travou", "congelou", "congelando", "lento",
        "lentidao", "esta lento", " dll", "arquivo corrompido",
        "arquivo ausente", "registro do windows", "boot", "nao inicia",
        "tela de erro", "mensagem de erro", "aplicacao",
        "configurar programa", "licenca", "ativar", "ativacao",
    ]),
]


def _classificar_por_regras(texto: str) -> Categoria:
    """Classifica por palavras-chave. Se houver multiplos matches, retorna
    o primeiro segundo a ordem de _REGRAS (mais especifico primeiro)."""
    t = " " + _normaliza(texto) + " "  # padding p/ matches com espaco
    if not t.strip():
        return Categoria.OUTROS
    for categoria, palavras in _REGRAS:
        for p in palavras:
            if p in t:
                return categoria
    return Categoria.OUTROS


# ==================== API Publica ====================

def classificar(titulo: str, descricao: str = "") -> Categoria:
    """Classifica um chamado em uma das `Categoria`.

    Tenta o modelo .pkl, com fallback para regras.
    """
    _try_load_modelo()
    texto = f"{titulo or ''} {descricao or ''}".strip()

    if _modelo_ml is not None:
        try:
            pred = _modelo_ml(texto)
            mapa = {
                "hardware": Categoria.HARDWARE,
                "email": Categoria.EMAIL,
                "impressora": Categoria.IMPRESSORA,
                "servidor": Categoria.SERVIDOR,
                "software": Categoria.SOFTWARE,
                "redes": Categoria.REDES,
                "rede": Categoria.REDES,
                "acesso": Categoria.ACESSO,
                "seguranca": Categoria.SEGURANCA,
                "outros": Categoria.OUTROS,
            }
            cat = mapa.get(str(pred).lower().strip())
            if cat is not None:
                return cat
        except Exception as e:
            print(f"[ML] Erro ao usar modelo, fallback para regras: {e}")

    return _classificar_por_regras(texto)


def categoria_para_habilidade(categoria: Categoria) -> Optional[str]:
    """Mapeia a categoria do chamado para a habilidade requerida do tecnico.
    Retorna `None` para `OUTROS` (atribuir ao tecnico com menos tickets).
    """
    mapa = {
        Categoria.HARDWARE: "HARDWARE",
        Categoria.EMAIL: "SOFTWARE",  # Email tipicamente cai em software/config
        Categoria.IMPRESSORA: "IMPRESSORA",
        Categoria.SERVIDOR: "SERVIDOR",
        Categoria.SOFTWARE: "SOFTWARE",
        Categoria.REDES: "REDE",
        Categoria.ACESSO: "ACESSOS",
        Categoria.SEGURANCA: "SEGURANCA",
        Categoria.OUTROS: None,
    }
    return mapa.get(categoria)


# Habilidades "parecidas" para fallback quando o tecnico ideal nao tem vaga
_SIMILARES = {
    "HARDWARE": ["SERVIDOR", "IMPRESSORA"],
    "SOFTWARE": ["ACESSOS", "SERVIDOR"],
    "REDE": ["SERVIDOR", "SEGURANCA"],
    "SERVIDOR": ["REDE", "SOFTWARE"],
    "SEGURANCA": ["REDE", "ACESSOS"],
    "ACESSOS": ["SEGURANCA", "SOFTWARE"],
    "IMPRESSORA": ["HARDWARE"],
}


def habilidades_similares(habilidade: str) -> list[str]:
    """Lista de habilidades equivalentes/proximas para fallback."""
    return _SIMILARES.get(habilidade, [])
