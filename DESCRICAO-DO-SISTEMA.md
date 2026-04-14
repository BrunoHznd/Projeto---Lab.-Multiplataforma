# Descrição do Sistema — tiResolve

---

## 1. Descrição Geral

O **tiResolve** é um sistema multiplataforma e multi-tenant de gestão de chamados técnicos, monitoramento de infraestrutura e controle de inventário de equipamentos. Desenvolvido para atender organizações que necessitam de suporte técnico estruturado, o sistema permite que usuários registrem problemas em equipamentos, que técnicos recebam e resolvam esses chamados, e que administradores gerenciem toda a operação de forma centralizada.

O sistema adota uma arquitetura **multi-tenant**, na qual cada organização cadastrada possui um ambiente de dados completamente isolado. Isso permite que múltiplas empresas ou instituições utilizem a mesma infraestrutura de software sem que os dados de uma organização sejam acessíveis por outra. Cada organização recebe um código de acesso único, utilizado para vincular novos usuários ao ambiente correto.

A comunicação entre as plataformas (Web, Mobile e Desktop) e o servidor é feita por meio de uma **API REST** desenvolvida em Python com o framework **FastAPI**, utilizando **SQLAlchemy** como ORM e **SQLite** como banco de dados. A autenticação é baseada em **JWT (JSON Web Token)** com senhas protegidas por **bcrypt**.

---

## 2. Descrição Específica

### 2.1 Objetivo do Sistema

O tiResolve tem como objetivo principal oferecer uma solução integrada para:

- **Abertura e acompanhamento de chamados técnicos** — usuários reportam problemas em equipamentos, acompanham o andamento e se comunicam diretamente com o técnico responsável por meio de um chat integrado ao chamado.
- **Monitoramento de máquinas em rede** — um agente de software (Agent) é instalado nos computadores da organização e coleta, em intervalos regulares, métricas de uso de CPU, memória RAM e conectividade de rede, enviando esses dados automaticamente para o servidor.
- **Gestão de inventário** — equipamentos são catalogados com informações como nome, descrição, foto, status de garantia e campos personalizados definidos pelo administrador ou técnico.
- **Gestão de usuários** — administradores podem criar, editar e atribuir papéis aos membros da organização, além de gerar QR Codes para facilitar o cadastro de novos usuários.

### 2.2 Papéis de Usuário

O sistema define três papéis com níveis distintos de permissão:

- **Administrador (ADMIN)** — acesso total ao sistema. Pode criar a organização, gerenciar usuários (criar, editar papel e nome), atribuir técnicos a chamados, acessar o inventário, baixar o agente de monitoramento e gerar QR Codes para cadastro.
- **Técnico (TECNICO)** — responsável pelo atendimento dos chamados. Pode visualizar e finalizar chamados atribuídos, acessar o inventário, monitorar equipamentos e baixar o agente. Também pode se comunicar com o usuário via chat dentro do chamado.
- **Usuário (USUARIO)** — papel destinado aos usuários finais (alunos, colaboradores, professores). Pode abrir chamados, anexar imagens, editar seus próprios chamados e conversar com o técnico pelo chat integrado.

### 2.3 Funcionalidades por Plataforma

#### 2.3.1 Plataforma Web

A interface web é a plataforma principal de administração do sistema, desenvolvida com **React**. Oferece acesso completo a todas as funcionalidades e é acessada pelo navegador. As principais telas são:

| Tela | Funcionalidade |
|------|---------------|
| **Login** | Três modos de acesso: login convencional, cadastro com código da organização e criação de nova organização. Suporta leitura de QR Code via parâmetro na URL. |
| **Dashboard** | Painel com indicadores estatísticos: total de chamados, chamados abertos, em atendimento e finalizados, além de gráficos de desempenho. |
| **Chamados** | Listagem, criação, edição e exclusão de chamados. Inclui sistema de chat entre as partes envolvidas (usuário, técnico e administrador). O administrador pode atribuir técnicos e o técnico pode finalizar com relatório e foto da resolução. |
| **Equipamentos (Máquinas)** | Listagem de máquinas monitoradas com indicadores de CPU, memória e status de rede. Permite criar máquinas manualmente e baixar o script do agente de monitoramento com o código da organização embutido. |
| **Inventário** | Gestão de equipamentos com campos personalizados (chave/valor), controle de garantia (com data de expiração), upload de fotos e visualização detalhada ao clicar no item. Máquinas registradas pelo agente são automaticamente incluídas no inventário. |
| **Usuários** | Listagem dos membros da organização. O administrador pode editar nome e papel dos usuários. Permite gerar QR Code para cadastro rápido de novos usuários. Todos os usuários podem alterar a própria senha. É possível visualizar estatísticas de chamados por usuário. |

#### 2.3.2 Plataforma Desktop

A versão desktop é construída com **Electron** e utiliza a mesma base de código React da versão web, adaptada para execução como aplicativo nativo do sistema operacional. É direcionada a técnicos e administradores, permitindo acesso rápido às funcionalidades de monitoramento e gestão de chamados sem a necessidade de um navegador.

Funcionalidades principais:
- Visualização e gerenciamento de chamados no formato Kanban
- Monitoramento de máquinas com gráficos de uso de recursos
- Acesso ao inventário e equipamentos
- Geração de executável `.exe` para distribuição

#### 2.3.3 Plataforma Mobile

A versão mobile é desenvolvida com **React Native** utilizando o framework **Expo**, permitindo execução em dispositivos Android e iOS. É voltada principalmente para usuários finais que precisam reportar problemas de forma rápida e prática.

Funcionalidades principais:
- Abertura de chamados com captura de foto pela câmera do dispositivo
- Acompanhamento do status dos chamados em tempo real
- Chat com o técnico responsável
- Leitura de QR Code para cadastro rápido na organização

### 2.4 Agente de Monitoramento (Agent)

O agente de monitoramento é um script Python executado diretamente nas máquinas da rede. Cada organização gera seu próprio agente, que já contém o código de acesso da organização embutido no arquivo.

O agente coleta as seguintes métricas a cada 60 segundos:
- Percentual de uso de CPU
- Percentual de uso de memória RAM
- Status de conectividade (ping para DNS externo)
- Endereço IP local
- Nome do host (hostname)

Os dados são enviados via requisição HTTP POST para o endpoint `/monitoramento` da API. Ao receber os dados, o servidor:
1. Identifica a organização pelo código de acesso informado
2. Cria ou atualiza o registro da máquina na tabela `maquinas`
3. Se a máquina for nova, cria automaticamente um item correspondente na tabela `inventario`

### 2.5 Isolamento de Dados (Multi-Tenancy)

O mecanismo de isolamento funciona por meio da coluna `organizacao_id` presente nas tabelas `users`, `chamados`, `maquinas` e `inventario`. Todos os endpoints da API aplicam filtros automáticos baseados na organização do usuário autenticado, garantindo que:

- Um usuário só visualiza chamados da sua organização
- Um técnico só é listado para atribuição dentro da mesma organização
- Máquinas e itens de inventário são filtrados por organização
- A listagem de usuários retorna apenas membros da mesma organização
