"""
tiResolve System - Agent de Monitoramento
Script que roda nas máquinas da rede da faculdade para coletar
e enviar métricas (CPU, memória, ping) para a API.

Uso:
    python monitor_agent.py
    python monitor_agent.py --config caminho/para/config.json
"""

import json
import os
import sys
import time
import socket
import platform
import subprocess
from datetime import datetime

try:
    import psutil
    import requests
except ImportError:
    print("❌ Dependências não instaladas. Execute:")
    print("   pip install psutil requests")
    sys.exit(1)


# Intervalo padrão de coleta em segundos (1 minutos)
INTERVALO_PADRAO = 60


def carregar_config(caminho: str = "config.json") -> dict:
    """
    Carrega configuração do arquivo JSON.
    
    Args:
        caminho: Caminho para o arquivo config.json
    
    Returns:
        Dicionário com as configurações
    """
    if not os.path.exists(caminho):
        print(f"❌ Arquivo de configuração '{caminho}' não encontrado!")
        print("📝 Criando arquivo de exemplo...")
        config_exemplo = {
            "machine_id": f"pc_{socket.gethostname().lower()}",
            "api_url": "http://localhost:8000/monitoramento",
            "intervalo_segundos": INTERVALO_PADRAO,
            "ping_host": "8.8.8.8"
        }
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(config_exemplo, f, indent=2, ensure_ascii=False)
        print(f"✅ Arquivo '{caminho}' criado. Edite-o e execute novamente.")
        sys.exit(0)

    with open(caminho, "r", encoding="utf-8") as f:
        return json.load(f)


def coletar_cpu() -> float:
    """Coleta uso de CPU em porcentagem (média de 1 segundo)."""
    return psutil.cpu_percent(interval=1)


def coletar_memoria() -> float:
    """Coleta uso de memória RAM em porcentagem."""
    return psutil.virtual_memory().percent


def verificar_ping(host: str = "8.8.8.8") -> bool:
    """
    Verifica conectividade com ping.
    
    Args:
        host: Endereço para testar (padrão: Google DNS)
    
    Returns:
        True se o host responde, False caso contrário
    """
    try:
        param = "-n" if platform.system().lower() == "windows" else "-c"
        comando = ["ping", param, "1", "-w", "2000", host]
        resultado = subprocess.run(
            comando,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5
        )
        return resultado.returncode == 0
    except (subprocess.TimeoutExpired, Exception):
        return False


def obter_ip_local() -> str:
    """Obtém o endereço IP local da máquina."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "0.0.0.0"


def enviar_dados(api_url: str, dados: dict) -> bool:
    """
    Envia dados coletados para a API.
    
    Args:
        api_url: URL do endpoint de monitoramento
        dados: Dicionário com os dados a enviar
    
    Returns:
        True se enviado com sucesso, False caso contrário
    """
    try:
        response = requests.post(
            api_url,
            json=dados,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code in [200, 201]:
            print(f"  ✅ Dados enviados com sucesso!")
            return True
        else:
            print(f"  ⚠️ Resposta inesperada: {response.status_code}")
            print(f"     {response.text[:200]}")
            return False
    except requests.ConnectionError:
        print(f"  ❌ Erro de conexão com {api_url}")
        return False
    except requests.Timeout:
        print(f"  ❌ Timeout ao conectar com {api_url}")
        return False
    except Exception as e:
        print(f"  ❌ Erro ao enviar dados: {e}")
        return False


def ciclo_coleta(config: dict):
    """
    Executa um ciclo de coleta e envio de dados.
    
    Args:
        config: Dicionário com configurações
    """
    timestamp = datetime.utcnow().isoformat()
    print(f"\n📊 [{timestamp}] Coletando dados...")

    # Coleta métricas
    cpu = coletar_cpu()
    memoria = coletar_memoria()
    ping_host = config.get("ping_host", "8.8.8.8")
    conectividade = verificar_ping(ping_host)

    print(f"  💻 CPU: {cpu}%")
    print(f"  🧠 Memória: {memoria}%")
    print(f"  🌐 Ping ({ping_host}): {'OK' if conectividade else 'FALHOU'}")

    # Prepara payload
    dados = {
        "machine_id": config["machine_id"],
        "cpu": cpu,
        "memory": memoria,
        "status": "ONLINE" if conectividade else "OFFLINE",
        "timestamp": timestamp,
        "ip": obter_ip_local()
    }

    # Envia para a API
    enviar_dados(config["api_url"], dados)


def main():
    """Função principal do agent de monitoramento."""
    # Determina caminho do config
    config_path = "config.json"
    if len(sys.argv) > 2 and sys.argv[1] == "--config":
        config_path = sys.argv[2]

    # Carrega configuração
    config = carregar_config(config_path)
    intervalo = config.get("intervalo_segundos", INTERVALO_PADRAO)

    print("=" * 50)
    print("🖥️  tiResolve - Agent de Monitoramento")
    print("=" * 50)
    print(f"  Máquina: {config['machine_id']}")
    print(f"  API URL: {config['api_url']}")
    print(f"  Intervalo: {intervalo} segundos ({intervalo // 60} min)")
    print(f"  IP Local: {obter_ip_local()}")
    print("=" * 50)
    print("\n⏳ Iniciando coleta contínua (Ctrl+C para parar)...\n")

    try:
        while True:
            ciclo_coleta(config)
            print(f"\n  ⏰ Próxima coleta em {intervalo} segundos...")
            time.sleep(intervalo)
    except KeyboardInterrupt:
        print("\n\n🛑 Agent encerrado pelo usuário.")
        sys.exit(0)


if __name__ == "__main__":
    main()
