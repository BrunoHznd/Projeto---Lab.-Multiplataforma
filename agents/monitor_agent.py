"""
tiResolve - Agent de Monitoramento de Hardware
================================================
Baixe e execute diretamente:
   python tiresolve_agent_hw_XXXXXX.py

Nenhuma configuração extra é necessária!
As dependências são instaladas automaticamente.
No Windows, o console é ocultado para rodar em background.
"""

import subprocess
import sys
import os

# ===== Auto-instalar dependências =====
def _instalar():
    pacotes = {"psutil": "psutil", "requests": "requests"}
    for modulo, pip_nome in pacotes.items():
        try:
            __import__(modulo)
        except ImportError:
            print(f"📦 Instalando {pip_nome}...")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", pip_nome, "-q"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
_instalar()
# =======================================

import time
import socket
import platform
from datetime import datetime, timezone

import psutil
import requests as http_client


# ╔═══════════════════════════════════════════════════════╗
# ║  CONFIGURAÇÃO — preenchida automaticamente pelo       ║
# ║  servidor no momento do download. NÃO EDITE.          ║
# ╚═══════════════════════════════════════════════════════╝
API_URL = "__API_URL__"
CODIGO_ORGANIZACAO = "COLE_SEU_CODIGO_AQUI"
# Token (preenchido quando o agent e baixado a partir de um item de Inventario).
# Quando presente, o backend vincula esta maquina diretamente ao InventarioItem.
AGENT_TOKEN = "__AGENT_TOKEN__"
INTERVALO_SEGUNDOS = 60


# ===== Esconde o console no Windows (roda invisível) =====
if platform.system() == "Windows":
    try:
        import ctypes
        hwnd = ctypes.windll.kernel32.GetConsoleWindow()
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 0)
    except Exception:
        pass


def obter_ip_local() -> str:
    """Obtém IP local da máquina."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "0.0.0.0"


def verificar_ping(host: str = "8.8.8.8") -> bool:
    """Testa conectividade com ping."""
    try:
        param = "-n" if platform.system().lower() == "windows" else "-c"
        resultado = subprocess.run(
            ["ping", param, "1", "-w", "2000", host],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5
        )
        return resultado.returncode == 0
    except Exception:
        return False


def ciclo():
    """Coleta CPU, memória e ping — envia para a API."""
    cpu = psutil.cpu_percent(interval=1)
    memoria = psutil.virtual_memory().percent
    online = verificar_ping()

    dados = {
        "machine_id": socket.gethostname(),
        "tipo": "HARDWARE",
        "cpu": cpu,
        "memory": memoria,
        "status": "ONLINE" if online else "OFFLINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": obter_ip_local(),
        "codigo_organizacao": CODIGO_ORGANIZACAO,
    }
    if AGENT_TOKEN and not AGENT_TOKEN.startswith("__"):
        dados["agent_token"] = AGENT_TOKEN

    try:
        r = http_client.post(API_URL, json=dados, timeout=10)
        if r.status_code in [200, 201]:
            print(f"  ✅ [{datetime.now().strftime('%H:%M:%S')}] CPU={cpu}%  MEM={memoria}%  — Enviado!")
        else:
            print(f"  ⚠️ Resposta inesperada: {r.status_code}")
    except http_client.ConnectionError:
        print(f"  ❌ Sem conexão com o servidor")
    except Exception as e:
        print(f"  ❌ Erro: {e}")


def main():
    print("=" * 50)
    print("🖥️  tiResolve — Agent de Hardware")
    print("=" * 50)
    print(f"  Máquina:   {socket.gethostname()}")
    print(f"  IP Local:  {obter_ip_local()}")
    print(f"  Org:       {CODIGO_ORGANIZACAO}")
    print(f"  Servidor:  {API_URL}")
    print(f"  Intervalo: {INTERVALO_SEGUNDOS}s")
    print("=" * 50)
    print("\n⏳ Coletando dados... (Ctrl+C para parar)\n")

    while True:
        try:
            ciclo()
        except KeyboardInterrupt:
            print("\n🛑 Agent encerrado.")
            break
        except Exception as e:
            print(f"  ❌ Erro no ciclo: {e}")
        time.sleep(INTERVALO_SEGUNDOS)


if __name__ == "__main__":
    main()
