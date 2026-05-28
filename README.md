📚 LEP - Sistema de Reservas do Laboratório de Engenharia de Produção
Um sistema completo para gerenciamento de reservas do Laboratório de Engenharia de Produção (LEP) da Universidade Federal do Pará.

https://img.shields.io/badge/status-Ativo-success?style=flat-square
https://img.shields.io/badge/version-1.0.0-blue?style=flat-square
https://img.shields.io/badge/Firebase-8.10.1-orange?style=flat-square
https://img.shields.io/badge/license-MIT-green?style=flat-square

✨ Sobre o Projeto
O Sistema de Reservas do LEP foi desenvolvido para digitalizar e otimizar o processo de agendamento do laboratório, proporcionando:

✅ Transparência total nas reservas

🚀 Eficiência no gerenciamento de horários

📱 Acessibilidade para toda comunidade acadêmica

🔔 Notificações automáticas via Telegram

🎯 Funcionalidades Principais
Para Usuários
Funcionalidade	Descrição
📅 Calendário Mensal	Visualize dias disponíveis e ocupados de forma intuitiva
🌅🌇 Múltiplos Turnos	Reserve manhã, tarde e até noite (com justificativa)
🔍 Consulta Rápida	Clique em qualquer dia para ver quem já reservou
📱 WhatsApp	Campo com formatação automática
📋 Regras do LEP	Exibição clara das normas do laboratório
🎉 Easter Egg	Segredinho escondido no sistema! 🤫
Para Administradores
Funcionalidade	Descrição
📊 Dashboard	Gráficos e estatísticas em tempo real
✅ Aprovação Manual	Reservas noturnas requerem análise
🔄 Ações em Massa	Aprove, recuse ou exclua múltiplas reservas
📎 Exportação	Dados em Excel, CSV, PDF e JSON
🗃️ Backup/Restore	Segurança dos dados
🔐 Login Seguro	Autenticação via Firebase
Integrações
🤖 Telegram Bot - Notificações automáticas de novas reservas

🔥 Firebase - Banco de dados em tempo real

📊 Chart.js - Gráficos dinâmicos

🖼️ Demonstração
Tela Inicial	Calendário Mensal
https://via.placeholder.com/400x200?text=Tela+Inicial	https://via.placeholder.com/400x200?text=Calend%C3%A1rio
Painel Admin	Exportação
https://via.placeholder.com/400x200?text=Admin	https://via.placeholder.com/400x200?text=Exporta%C3%A7%C3%A3o
🛠️ Tecnologias Utilizadas
Frontend
text
├── HTML5 + CSS3
├── JavaScript (Vanilla)
├── Chart.js (Gráficos)
├── Font Awesome (Ícones)
└── Design Responsivo
Backend & Database
text
├── Firebase Firestore (NoSQL)
├── Firebase Authentication
└── Telegram Bot API
Bibliotecas Adicionais
XLSX (SheetJS) - Exportação Excel

jsPDF + autoTable - Exportação PDF

🚀 Como Executar o Projeto
Pré-requisitos
Navegador moderno (Chrome, Firefox, Edge)

Conexão com internet (para Firebase)

(Opcional) Servidor local como Live Server

Passos
Clone o repositório

bash
git clone https://github.com/seu-usuario/lep-reservas.git
cd lep-reservas
Abra o projeto

bash
# Com Live Server (VS Code)
Clique com botão direito no index.html > "Open with Live Server"

# Ou diretamente
Abra o arquivo index.html no navegador
Estrutura de arquivos

text
lep-reservas/
├── index.html          # Tela inicial com calendário
├── mapa.html           # Informações do laboratório
├── login.html          # Login administrativo
├── admin.html          # Painel do administrador
├── dedicatoria.html    # 🥚 Easter Egg
├── css/
│   ├── style.css       # Estilos principais
│   ├── mapa.css        # Estilos da página mapa
│   └── style-admin.css # Estilos do admin
├── js/
│   ├── script-firebase.js  # Lógica principal
│   ├── admin-firebase.js   # Firebase no admin
│   ├── admin-auth.js       # Autenticação
│   ├── admin-scripts.js    # Admin funcionalidades
│   ├── telegram-notificacao.js
│   └── analytics-simples.js
└── imagens/            # Imagens do projeto
📋 Regras de Negócio
Reservas
Regra	Descrição
✅ Manhã/Tarde	Aprovadas automaticamente
⏳ Noite	Requer análise manual + justificativa
🚫 Finais de Semana	Bloqueados para reservas automáticas
🎉 Feriados	Bloqueio total conforme calendário acadêmico
📅 Datas Futuras	Apenas dias a partir de hoje
🔄 Múltiplos Turnos	Permitido reservar vários turnos por dia
Feriados Configurados (2026)
Feriados Nacionais (01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11, 25/12)

Carnaval (pontos facultativos)

Feriado Estadual do Pará (15/08)

Pontos facultativos específicos

👥 Acessos
Usuário Comum
Acesso direto ao index.html

Pode visualizar e criar reservas

Administrador
Acesso via login.html

Credenciais cadastradas no Firebase

Pode gerenciar todas as reservas

🔔 Telegram Notificações
O sistema envia notificações para um grupo do Telegram quando:

✅ Nova reserva criada (manhã/tarde)

⏳ Nova reserva noturna (aguardando aprovação)

Configuração do Bot:

javascript
// Em telegram-notificacao.js
const TOKEN = "SEU_TOKEN_AQUI";
const CHAT_ID_DO_GRUPO = "-1003832202230";
🐛 Possíveis Problemas e Soluções
Problema	Solução
Reservas não carregam	Verifique conexão com internet
Erro no Firebase	Aguarde ou recarregue a página
Botão "Nova Reserva" sem resposta	Abra o console (F12) e verifique erros
Data não aparece	Limpe o cache do navegador
📦 Estrutura do Banco de Dados (Firestore)
javascript
reservas/ (coleção)
  └── {documentId}/
      ├── email: string
      ├── whatsapp: string
      ├── responsavel: string
      ├── finalidade: string
      ├── ocupacao: string
      ├── dias: array (YYYY-MM-DD UTC)
      ├── turno: string (manha/tarde/noite)
      ├── status: string (aprovado/pendente/recusado)
      ├── justificativaNoite: string (opcional)
      ├── criadoEm: timestamp
      ├── aprovadoEm: timestamp (opcional)
      └── aprovadoPor: string (opcional)

admins/ (coleção)
  └── {uid}/
      ├── nome: string
      ├── email: string
      ├── nivel: string
      ├── ativo: boolean
      └── criadoEm: timestamp
🤝 Contribuição
Contribuições são super bem-vindas!

Faça um Fork do projeto

Crie uma Branch (git checkout -b feature/nova-funcionalidade)

Commit suas mudanças (git commit -m 'feat: Adiciona nova funcionalidade')

Push para a Branch (git push origin feature/nova-funcionalidade)

Abra um Pull Request

📞 Contato & Suporte
Criador do Sistema
Marcell Costa de Sena - Estudante de Engenharia de Produção

https://img.shields.io/badge/GitHub-MarcellCosta31-24292e?style=flat-square&logo=github
https://img.shields.io/badge/Instagram-@marcell_luacheia-E4405F?style=flat-square&logo=instagram
https://img.shields.io/badge/WhatsApp-(91)%252098531-7663-25D366?style=flat-square&logo=whatsapp

Suporte LEP
Responsável	WhatsApp
Maria Alice	(91) 99230-0743
Eva	(91) 98531-7663
📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

🌟 Agradecimentos
Prof. Dr. Eduardo Braga - Coordenador do LEP

Equipe de bolsistas - Pelo suporte e testes

Comunidade FEI/UFPA - Pelo uso e feedback

<p align="center"> Feito com 💙 por <strong>Marcell Costa de Sena</strong> para o Laboratório de Engenharia de Produção </p><p align="center"> <a href="index.html">🌐 Acessar Sistema</a> • <a href="mapa.html">🗺️ Sobre o LEP</a> • <a href="login.html">🔐 Área Admin</a> </p>
