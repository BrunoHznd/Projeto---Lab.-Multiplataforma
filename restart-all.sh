#!/bin/bash

# Script para reiniciar e atualizar o tiResolve completo
# Uso: ./restart-all.sh

echo "=== tiResolve - Script de Reinício e Atualização ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# 1. Reiniciar Backend
print_info "Reiniciando backend..."
sudo systemctl restart tiresolve-backend
if [ $? -eq 0 ]; then
    print_success "Backend reiniciado"
else
    print_error "Erro ao reiniciar backend"
    exit 1
fi

# 2. Build do Frontend
print_info "Fazendo build do frontend..."
cd /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/frontend/web
npm run build
if [ $? -eq 0 ]; then
    print_success "Build do frontend concluído"
else
    print_error "Erro no build do frontend"
    exit 1
fi

# 3. Copiar arquivos para /var/www/tiresolve
print_info "Copiando arquivos para /var/www/tiresolve..."
sudo mkdir -p /var/www/tiresolve
sudo cp -r /root/ProjectMulti/Projeto---Lab.-Multiplataforma/ci-support-system/frontend/web/build/* /var/www/tiresolve/
if [ $? -eq 0 ]; then
    print_success "Arquivos copiados"
else
    print_error "Erro ao copiar arquivos"
    exit 1
fi

# 4. Corrigir permissões
print_info "Corrigindo permissões..."
sudo chmod -R 755 /var/www/tiresolve
sudo find /var/www/tiresolve -type d -exec chmod 755 {} \;
sudo find /var/www/tiresolve -type f -exec chmod 644 {} \;
sudo chmod 755 /var/www/tiresolve/static/css
sudo chmod 755 /var/www/tiresolve/static/js
sudo chown -R www-data:www-data /var/www/tiresolve
print_success "Permissões corrigidas"

# 5. Reiniciar Nginx
print_info "Reiniciando Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    print_success "Nginx reiniciado"
else
    print_error "Erro na configuração do Nginx"
    exit 1
fi

# 6. Verificar status dos serviços
echo ""
print_info "Status dos serviços:"
echo ""
sudo systemctl status tiresolve-backend --no-pager -l
echo ""
sudo systemctl status nginx --no-pager -l
echo ""

# 7. Testar endpoints
print_info "Testando endpoints..."
echo ""
echo "Backend local:"
curl -s http://127.0.0.1:8000/ | head -c 100
echo ""
echo ""
echo "Backend via Nginx:"
curl -s http://67.211.211.231/api/ | head -c 100
echo ""
echo ""

print_success "=== tiResolve reiniciado e atualizado com sucesso! ==="
echo ""
echo "Acesse: http://67.211.211.231"
echo "API Docs: http://67.211.211.231/api/docs"
