#!/usr/bin/env bash
# Executa a suite Selenium contra a WEB e gera o relatorio sobre o Backend.
# Uso:
#   ./run_tests.sh                 # roda headless
#   HEADED=1 ./run_tests.sh        # roda com janela visivel (precisa display)
#   TIRESOLVE_URL=http://localhost ./run_tests.sh

set -e

cd "$(dirname "$0")"
ROOT_DIR="$(cd ../.. && pwd)"

# ----- 1) Garante Google Chrome instalado -----
if ! command -v google-chrome >/dev/null 2>&1; then
  echo ">> Instalando Google Chrome (necessario para o Selenium)..."
  TMP_DEB="/tmp/google-chrome-stable.deb"
  wget -q -O "$TMP_DEB" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y "$TMP_DEB" || { apt-get update && apt-get install -y "$TMP_DEB"; }
  rm -f "$TMP_DEB"
fi
echo ">> Chrome: $(google-chrome --version)"

# ----- 2) Cria venv local para os testes -----
VENV_DIR="$(pwd)/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo ">> Criando venv em $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# ----- 3) Backend acessivel? -----
URL="${TIRESOLVE_URL:-http://localhost}"
echo ">> Verificando ${URL}/api ..."
if ! curl -fs "${URL}/api/" >/dev/null 2>&1; then
  echo "[!] Backend nao respondeu em ${URL}/api/. Verifique o servico tiresolve-backend e o nginx."
  exit 2
fi

# ----- 4) Roda os testes -----
mkdir -p report
echo ">> Rodando pytest (Selenium)..."
set +e
pytest -v --tb=short --color=yes -p no:cacheprovider 2>&1 | tee report/pytest_output.log
RC=${PIPESTATUS[0]}
set -e

echo ""
echo "============================================================"
echo " Relatorio Markdown: $(pwd)/report/backend_report.md"
echo " Relatorio PDF:      $(pwd)/report/backend_report.pdf"
echo " Relatorio DOCX:     $(pwd)/report/backend_report.docx"
echo " Relatorio JSON:     $(pwd)/report/backend_report.json"
echo " Saida do pytest:    $(pwd)/report/pytest_output.log"
echo "============================================================"

exit $RC
