"""
tiResolve - Agent de Monitoramento de Rede
================================================
Baixe e execute diretamente:
   python tiresolve_agent_rede_XXXXXX.py

Nenhuma configuração extra é necessária!
As dependências são instaladas automaticamente.
No Windows, o console é ocultado para rodar em background.
"""

import subprocess
import sys
import os

# ===== Auto-instalar dependências =====
def _instalar():
    pacotes = {"requests": "requests", "speedtest": "speedtest-cli"}
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

import requests as http_client
import speedtest


# ╔═══════════════════════════════════════════════════════╗
# ║  CONFIGURAÇÃO — preenchida automaticamente pelo      ║
# ║  servidor no momento do download. NÃO EDITE.         ║
# ╚═══════════════════════════════════════════════════════╝
API_URL = "__API_URL__"
CODIGO_ORGANIZACAO = "COLE_SEU_CODIGO_AQUI"
# Token (preenchido quando o agent e baixado a partir de um item de Inventario).
# Quando presente, o backend vincula esta maquina diretamente ao InventarioItem.
AGENT_TOKEN = "__AGENT_TOKEN__"
INTERVALO_SEGUNDOS = 300  # 5 minutos (speedtest consome banda)


# ===== Esconde o console no Windows (roda invisível) =====
if platform.system() == "Windows":
    try:
        import ctypes
        hwnd = ctypes.windll.kernel32.GetConsoleWindow()
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 0)
    except Exception:
        pass


def obter_ip_publico() -> str:
    """Obtém IP público via serviço externo."""
    try:
        return http_client.get("https://api.ipify.org", timeout=5).text
    except Exception:
        return obter_ip_local()


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


def obter_nome_rede() -> str:
    """Descobre o nome da rede Wi-Fi/Ethernet conectada."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.split("\n"):
                if "SSID" in line and "BSSID" not in line:
                    nome = line.split(":", 1)[1].strip()
                    if nome:
                        return nome
        else:
            result = subprocess.run(
                ["iwgetid", "-r"],
                capture_output=True, text=True, timeout=5
            )
            if result.stdout.strip():
                return result.stdout.strip()
    except Exception:
        pass
    return f"Rede-{socket.gethostname()}"


def ciclo():
    """Mede download/upload via Speedtest e envia para a API."""
    print(f"  🌐 [{datetime.now().strftime('%H:%M:%S')}] Medindo velocidade...")

    try:
        st = speedtest.Speedtest()
        st.get_best_server()
        dl = st.download() / 1_000_000   # bps → Mbps
        ul = st.upload() / 1_000_000
        online = True
    except Exception as e:
        print(f"  ❌ Speedtest falhou: {e}")
        dl, ul, online = 0.0, 0.0, False

    nome_rede = obter_nome_rede()
    ip_publico = obter_ip_publico()

    dados = {
        "machine_id": nome_rede,
        "tipo": "REDE",
        "download_speed": round(dl, 2),
        "upload_speed": round(ul, 2),
        "status": "ONLINE" if online else "OFFLINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": ip_publico,
        "codigo_organizacao": CODIGO_ORGANIZACAO,
    }
    if AGENT_TOKEN and not AGENT_TOKEN.startswith("__"):
        dados["agent_token"] = AGENT_TOKEN

    try:
        r = http_client.post(API_URL, json=dados, timeout=10)
        if r.status_code in [200, 201]:
            print(f"  ✅ Download={dl:.1f}Mbps  Upload={ul:.1f}Mbps  — Enviado!")
        else:
            print(f"  ⚠️ Resposta: {r.status_code}")
    except http_client.ConnectionError:
        print(f"  ❌ Sem conexão com o servidor")
    except Exception as e:
        print(f"  ❌ Erro: {e}")


def main():
    print("=" * 50)
    print("🌐 tiResolve — Agent de Rede")
    print("=" * 50)
    print(f"  Rede:       {obter_nome_rede()}")
    print(f"  IP Público: {obter_ip_publico()}")
    print(f"  Org:        {CODIGO_ORGANIZACAO}")
    print(f"  Servidor:   {API_URL}")
    print(f"  Intervalo:  {INTERVALO_SEGUNDOS}s")
    print("=" * 50)
    print("\n⏳ Coletando dados... (Ctrl+C para parar)\n")

    while True:
        try:
            ciclo()
        except KeyboardInterrupt:
            print("\n🛑 Agent de rede encerrado.")
            break
        except Exception as e:
            print(f"  ❌ Erro no ciclo: {e}")
        time.sleep(INTERVALO_SEGUNDOS)


if __name__ == "__main__":
    main()
