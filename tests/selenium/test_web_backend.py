"""
Testes End-to-End (Selenium) que exercitam o BACKEND atraves da WEB.

Cobrem os modulos: Auth, Inventario (com novo controle de garantia por datas),
Chamados, Usuarios, Maquinas, Dashboard e logout.

Setup/teardown sao feitos via API apenas para criar/remover a organizacao de
testes (isolamento). Toda a validacao funcional acontece pela WEB.
"""

# Catalogo: descricao detalhada do que cada teste valida, como e quais
# endpoints do backend sao acionados ao executar a acao na WEB.
CASOS = {
    "test_admin_login_via_ui": {
        "descricao": "Valida autenticacao do usuario ADMIN pela tela /login.",
        "como": (
            "Abre /login, preenche e-mail e senha do admin recem-criado, "
            "submete o formulario e aguarda redirecionamento para /dashboard."
        ),
        "endpoints": [
            "POST /auth/login -> 200 + JWT no localStorage",
        ],
        "validacoes": [
            "URL sai de /login",
            "URL termina em /dashboard (rota default do ADMIN)",
        ],
    },
    "test_admin_dashboard_carrega": {
        "descricao": "Garante que /dashboard renderiza apos login.",
        "como": (
            "Aguarda o seletor .page-title aparecer na pagina apos o "
            "redirecionamento do login."
        ),
        "endpoints": [
            "GET /chamados/ -> 200 (cards/contadores)",
            "GET /maquinas -> 200 (cards de infraestrutura)",
        ],
        "validacoes": [
            "Elemento .page-title presente",
        ],
    },
    "test_admin_navega_inventario": {
        "descricao": "Acessa a tela de Inventario via sidebar e confirma listagem.",
        "como": (
            "Clica no link da sidebar com href=/inventario e espera a tabela "
            "carregar; verifica que o botao 'Novo Item' esta visivel."
        ),
        "endpoints": [
            "GET /inventario -> 200 (lista paginada da organizacao)",
        ],
        "validacoes": [
            ".table-container renderizou",
            "Botao 'Novo Item' visivel para ADMIN",
        ],
    },
    "test_admin_cria_item_inventario_com_garantia": {
        "descricao": (
            "Valida o NOVO controle de garantia (Data da compra + Fim da "
            "garantia) e a exibicao automatica de 'Em garantia ate DD/MM/AAAA' "
            "sem deslocamento de fuso (sem dia -1)."
        ),
        "como": (
            "Abre o modal 'Novo Item', preenche nome unico; define data_compra "
            "= hoje e garantia_ate = hoje + 1 ano via JS (compatibilidade com "
            "input type=date); confere o aviso em tempo real dentro do modal; "
            "salva e localiza a linha na tabela."
        ),
        "endpoints": [
            "POST /inventario -> 201 (cria o item)",
            "GET /inventario -> 200 (refresh apos salvar)",
        ],
        "validacoes": [
            "Modal exibe 'Em garantia ate DD/MM/AAAA' com a data EXATA digitada",
            "Modal fecha apos salvar",
            "Tabela contem nova linha com o nome do item",
            "Badge da linha mostra 'Ate DD/MM/AAAA' (sem dia -1)",
        ],
    },
    "test_admin_lista_usuarios": {
        "descricao": "Confirma que a pagina /usuarios lista os usuarios da org.",
        "como": "Clica em /usuarios na sidebar e aguarda a <table> renderizar.",
        "endpoints": [
            "GET /auth/users -> 200 (usuarios da organizacao do admin)",
        ],
        "validacoes": [
            "Tabela renderizou",
            "Usuario USR de teste aparece no body da pagina",
        ],
    },
    "test_admin_lista_maquinas": {
        "descricao": "Garante que a tela de Maquinas carrega sem erro.",
        "como": "Clica em /maquinas na sidebar e aguarda .page-title.",
        "endpoints": [
            "GET /maquinas -> 200",
            "GET /grupos -> 200",
        ],
        "validacoes": [
            "Elemento .page-title visivel",
        ],
    },
    "test_admin_lista_chamados": {
        "descricao": "Confirma que /chamados carrega para o ADMIN.",
        "como": "Clica em /chamados na sidebar e aguarda .page-title.",
        "endpoints": [
            "GET /chamados/ -> 200",
            "GET /chamados/tecnicos -> 200 (lista de tecnicos para atribuicao)",
        ],
        "validacoes": [
            "Elemento .page-title visivel",
        ],
    },
    "test_admin_logout": {
        "descricao": "Logout limpa sessao e volta para /login.",
        "como": "Clica no botao .sidebar-logout e aguarda URL conter /login.",
        "endpoints": [
            "(nenhum endpoint do backend - logout e cliente, drop do JWT)",
        ],
        "validacoes": [
            "URL contem /login apos clique",
        ],
    },
    "test_usuario_login_e_cria_chamado": {
        "descricao": (
            "Usuario comum (USUARIO) autentica e abre um chamado pela tela, "
            "exercitando o caminho de criacao de tickets."
        ),
        "como": (
            "Faz login com o usuario de teste, e' redirecionado para /chamados, "
            "clica em 'Novo Chamado', preenche titulo + descricao e submete."
        ),
        "endpoints": [
            "POST /auth/login -> 200",
            "GET /chamados/ -> 200 (apos login)",
            "GET /maquinas -> 200 (lista de equipamentos no modal)",
            "POST /chamados/ -> 201 (cria o chamado)",
        ],
        "validacoes": [
            "Modal fecha apos submissao",
            "Tela passa a conter o titulo do chamado criado",
        ],
    },
    "test_usuario_logout": {
        "descricao": "Logout do USUARIO comum volta para /login.",
        "como": "Clica em .sidebar-logout e espera /login.",
        "endpoints": [
            "(sem chamada de backend)",
        ],
        "validacoes": [
            "URL contem /login",
        ],
    },
}
import time
import datetime as dt

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


# ----------------------- helpers -----------------------

def _login_via_ui(driver, wait, base_url, email, senha):
    driver.get(f"{base_url}/login")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(senha)
    driver.find_element(By.CSS_SELECTOR, "button.btn-primary").click()
    # Espera sair do /login
    wait.until(lambda d: "/login" not in d.current_url)


def _set_date_input(driver, element, value_iso):
    """Define o valor de um input[type=date] de forma confiavel.
    value_iso no formato YYYY-MM-DD.
    """
    driver.execute_script(
        "const e=arguments[0],v=arguments[1];"
        "const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;"
        "setter.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));"
        "e.dispatchEvent(new Event('change',{bubbles:true}));",
        element, value_iso
    )


def _click_sidebar_link(driver, wait, rota):
    """Clica no link da sidebar pelo atributo href."""
    el = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, f"a.sidebar-link[href='{rota}']")))
    el.click()


def _logout(driver, wait):
    btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.sidebar-logout")))
    btn.click()
    wait.until(EC.url_contains("/login"))


# ----------------------- testes ADMIN -----------------------

def test_admin_login_via_ui(driver, wait, credenciais):
    """Login do ADMIN deve redirecionar para /dashboard (backend POST /auth/login)."""
    _login_via_ui(driver, wait, credenciais["base_url"],
                  credenciais["admin_email"], credenciais["admin_senha"])
    wait.until(EC.url_contains("/dashboard"))
    assert "/dashboard" in driver.current_url


def test_admin_dashboard_carrega(driver, wait):
    """Dashboard deve renderizar (chamadas a /chamados, /maquinas, etc.)."""
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title")))
    titulo = driver.find_element(By.CSS_SELECTOR, ".page-title").text.lower()
    assert "dashboard" in titulo or "visao" in titulo or "geral" in titulo or titulo != ""


def test_admin_navega_inventario(driver, wait):
    """Acessa /inventario (backend GET /inventario)."""
    _click_sidebar_link(driver, wait, "/inventario")
    wait.until(EC.url_contains("/inventario"))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".table-container")))
    # Botao Novo Item visivel
    btn = driver.find_element(By.XPATH, "//button[contains(., 'Novo Item')]")
    assert btn.is_displayed()


def test_admin_cria_item_inventario_com_garantia(driver, wait):
    """Cria item com data_compra e garantia_ate (backend POST /inventario).
    Valida que o badge 'Em garantia' aparece e respeita o dia exato (sem -1).
    """
    driver.find_element(By.XPATH, "//button[contains(., 'Novo Item')]").click()
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".modal")))

    nome_teste = f"Notebook Selenium {dt.datetime.now().strftime('%H%M%S')}"
    driver.find_element(By.CSS_SELECTOR, ".modal input.form-input").send_keys(nome_teste)

    # Datas: compra hoje, garantia +1 ano
    hoje = dt.date.today()
    fim = hoje.replace(year=hoje.year + 1)
    inputs_date = driver.find_elements(By.CSS_SELECTOR, ".modal input[type='date']")
    assert len(inputs_date) >= 2, "esperados 2 inputs de data (compra/fim garantia)"
    _set_date_input(driver, inputs_date[0], hoje.isoformat())
    _set_date_input(driver, inputs_date[1], fim.isoformat())

    # Mensagem em tempo real deve refletir o dia exato (formato pt-BR)
    esperado_pt = fim.strftime("%d/%m/%Y")
    aviso = driver.find_element(
        By.XPATH, "//div[contains(@class,'modal')]//p[contains(., 'Em garantia') or contains(., 'Garantia vencida')]"
    ).text
    assert esperado_pt in aviso, f"Esperava {esperado_pt} no aviso de garantia, obtido: {aviso}"

    # Salvar
    driver.find_element(By.XPATH, "//div[contains(@class,'modal')]//button[contains(., 'Salvar')]").click()

    # O modal fecha e o item aparece na tabela; aguarda
    wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".modal-overlay")))
    wait.until(EC.presence_of_element_located((By.XPATH, f"//td[contains(., '{nome_teste}')]")))

    # Badge de garantia na linha tem que conter a data correta
    linha = driver.find_element(By.XPATH, f"//tr[td[contains(., '{nome_teste}')]]")
    badge_text = linha.find_element(By.CSS_SELECTOR, "span.badge").text
    assert esperado_pt in badge_text, f"Badge sem a data esperada ({esperado_pt}): {badge_text}"
    assert "Ate" in badge_text or "ate" in badge_text.lower()


def test_admin_lista_usuarios(driver, wait):
    """Pagina /usuarios carrega (backend GET /auth/users)."""
    _click_sidebar_link(driver, wait, "/usuarios")
    wait.until(EC.url_contains("/usuarios"))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table")))
    # O usuario criado no setup deve estar listado
    body = driver.find_element(By.TAG_NAME, "body").text
    assert "selenium_user_" in body.lower() or "Usuario Selenium" in body


def test_admin_lista_maquinas(driver, wait):
    """Pagina /maquinas carrega (backend GET /maquinas)."""
    _click_sidebar_link(driver, wait, "/maquinas")
    wait.until(EC.url_contains("/maquinas"))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title")))


def test_admin_lista_chamados(driver, wait):
    """Pagina /chamados carrega (backend GET /chamados)."""
    _click_sidebar_link(driver, wait, "/chamados")
    wait.until(EC.url_contains("/chamados"))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title")))


def test_admin_logout(driver, wait):
    """Logout volta para /login."""
    _logout(driver, wait)
    assert "/login" in driver.current_url


# ----------------------- testes USUARIO comum -----------------------

def test_usuario_login_e_cria_chamado(driver, wait, credenciais):
    """Usuario comum autentica e cria chamado pela WEB (backend POST /chamados)."""
    _login_via_ui(driver, wait, credenciais["base_url"],
                  credenciais["user_email"], credenciais["user_senha"])
    wait.until(EC.url_contains("/chamados"))

    # Abre modal Novo Chamado
    wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(., 'Novo Chamado')]")
    )).click()
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".modal")))

    titulo = f"Chamado Selenium {dt.datetime.now().strftime('%H%M%S')}"
    driver.find_element(By.CSS_SELECTOR, ".modal input.form-input").send_keys(titulo)
    driver.find_element(By.CSS_SELECTOR, ".modal textarea.form-textarea").send_keys(
        "Chamado gerado automaticamente pelos testes end-to-end (Selenium)."
    )
    driver.find_element(
        By.XPATH, "//div[contains(@class,'modal')]//button[contains(., 'Abrir Chamado')]"
    ).click()

    wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".modal-overlay")))
    wait.until(EC.presence_of_element_located((By.XPATH, f"//*[contains(., '{titulo}')]")))


def test_usuario_logout(driver, wait):
    _logout(driver, wait)
    assert "/login" in driver.current_url
