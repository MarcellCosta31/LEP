// telegram-notificacao.js - VERSÃO PARA GRUPO

async function notificarTelegram(reserva) {
  const TOKEN = window.APP_CONFIG.TELEGRAM_TOKEN;
  const CHAT_ID = window.APP_CONFIG.TELEGRAM_CHAT_ID;
  
  console.log('🔔 Iniciando notificação Telegram...');

  // Formatar o turno para exibição
  const formatarTurno = (turno) => {
    if (turno === 'manha') return 'Manhã (08h-12h)';
    if (turno === 'tarde') return 'Tarde (14h-17h)';
    if (turno === 'noite') return 'Noite (18h-22h)';
    return turno;
  };

  // Formatar datas para exibição
  const formatarDatas = (dias) => {
    if (!dias || !Array.isArray(dias)) return 'Não informado';
    
    return dias.map(dataStr => {
      try {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
          return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dataStr;
      } catch (e) {
        return dataStr;
      }
    }).join(', ');
  };

  // Formatar ocupação
  const formatarOcupacao = (ocupacao) => {
    const ocupacoes = {
      'docente_fei': 'Docente da FEI',
      'docente_outros': 'Docente de outros cursos',
      'discente_producao': 'Discente de Produção',
      'tecnico_administrativo': 'Técnico-Administrativo',
      'usuario_externo': 'Usuário Externo'
    };
    return ocupacoes[ocupacao] || ocupacao;
  };

  // Construir mensagem formatada
  const turnoFormatado = formatarTurno(reserva.turno);
  const datasFormatadas = formatarDatas(reserva.dias);
  const ocupacaoFormatada = formatarOcupacao(reserva.ocupacao);
  
  // Truncar textos longos
  const finalidadeTruncada = reserva.finalidade 
    ? (reserva.finalidade.length > 100 ? reserva.finalidade.substring(0, 100) + '...' : reserva.finalidade)
    : 'Não informada';
  
  const justificativaTruncada = reserva.justificativaNoite 
    ? (reserva.justificativaNoite.length > 500 ? reserva.justificativaNoite.substring(0, 100) + '...' : reserva.justificativaNoite)
    : '';

  const mensagem = `📅 *NOVA RESERVA NO LEP*

👤 *Responsável:* ${reserva.responsavel}
📧 *Email:* ${reserva.email}
📱 *WhatsApp:* ${reserva.whatsapp}
🕒 *Turno:* ${turnoFormatado}
📆 *Datas:* ${datasFormatadas}
📋 *Ocupação:* ${ocupacaoFormatada}
🎯 *Finalidade:* ${finalidadeTruncada}

${reserva.status !== 'aprovado' ? '⚠️ *ATENÇÃO: Reserva pendente - Necessita aprovação*' : '✅ *Reserva aprovada automaticamente*'}
${reserva.justificativaNoite ? `📝 *Justificativa:* ${justificativaTruncada}` : ''}

📊 *Status:* ${reserva.status === 'aprovado' ? 'APROVADO ✅' : 'PENDENTE ⏳'}
⏰ *Criado em:* ${new Date().toLocaleString('pt-BR')}`;

  console.log('Mensagem formatada:', mensagem);

  try {
    // 🔧 ENVIAR PARA O GRUPO (prioridade)
    const payload = {
      chat_id: CHAT_ID,
      text: mensagem,
      parse_mode: "Markdown"
    };

    console.log(`📤 Enviando para GRUPO (ID: ${CHAT_ID})...`);
    
    // TENTATIVA 1: Envio direto para o grupo
    try {
      const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Notificação enviada para o GRUPO com sucesso!`);
        
        // 🔧 OPÇÃO: Também enviar para o chat privado (se quiser)
        // await enviarParaChatPrivado(reserva, mensagem);
        
        return true;
      } else {
        console.error('❌ Erro ao enviar para grupo:', result);
        
        // Se falhar no grupo, tentar no privado como fallback
        if (result.description && result.description.includes('chat not found')) {
          console.log('🔄 Grupo não encontrado, tentando chat privado...');
          return await enviarParaChatPrivado(reserva, mensagem, TOKEN, CHAT_ID);
        }
      }
    } catch (directError) {
      console.error('❌ Erro de conexão com grupo:', directError);
      
      // Fallback para chat privado
      console.log('🔄 Tentando chat privado como fallback...');
      return await enviarParaChatPrivado(reserva, mensagem, TOKEN, CHAT_ID);
    }

  } catch (error) {
    console.error('❌ Erro crítico ao enviar para Telegram:', error);
    
    // Última tentativa: chat privado
    try {
      console.log('🔄 Última tentativa: chat privado...');
      return await enviarParaChatPrivado(reserva, mensagem, TOKEN, CHAT_ID);
    } catch (finalError) {
      console.error('❌ Todas as tentativas falharam:', finalError);
      return false;
    }
  }
}

// 🔧 FUNÇÃO AUXILIAR para enviar para chat privado
async function enviarParaChatPrivado(reserva, mensagem, token, chatIdPrivado) {
  try {
    console.log(`📤 Enviando para chat privado (ID: ${chatIdPrivado})...`);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatIdPrivado,
        text: `[FALLBACK] ${mensagem}`,
        parse_mode: "Markdown"
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Enviado para chat privado (fallback)');
      return true;
    } else {
      console.error('❌ Falha também no chat privado:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro no fallback privado:', error);
    return false;
  }
}

// 🔧 FUNÇÃO PARA TESTAR O GRUPO
async function testarGrupoTelegram() {
  const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
  
  // Primeiro descubra o chat ID do grupo
  console.log('🔍 Buscando informações do grupo...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
    const result = await response.json();
    
    if (result.ok && result.result.length > 0) {
      const grupos = result.result.filter(update => 
        update.message && 
        (update.message.chat.type === 'group' || update.message.chat.type === 'supergroup')
      );
      
      if (grupos.length > 0) {
        console.log('🎯 GRUPOS ENCONTRADOS:');
        grupos.forEach((grupo, index) => {
          const chat = grupo.message.chat;
          console.log(`\n${index + 1}. ${chat.title}`);
          console.log(`   ID do Grupo: ${chat.id}`);
          console.log(`   Tipo: ${chat.type}`);
          
          // Testar envio para este grupo
          console.log(`   🔧 Testando envio...`);
          
          fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chat.id,
              text: `✅ Teste de notificação do LEP\nEste grupo está configurado corretamente!\n${new Date().toLocaleString('pt-BR')}`,
              parse_mode: "Markdown"
            })
          })
          .then(r => r.json())
          .then(r => console.log(`   Resultado: ${r.ok ? '✅ Sucesso' : '❌ Falha'}`))
          .catch(e => console.log(`   Erro: ${e.message}`));
        });
      } else {
        console.log('⚠️ Nenhum grupo encontrado.');
        console.log('   Para configurar:');
        console.log('   1. Crie um grupo no Telegram');
        console.log('   2. Adicione @reservas_lep_bot ao grupo');
        console.log('   3. Envie qualquer mensagem no grupo');
        console.log('   4. Execute esta função novamente');
      }
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// 🔧 FUNÇÃO PARA CONFIGURAR AUTOMATICAMENTE
async function configurarGrupoAutomatico() {
  const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
  
  console.log('⚙️ Configurando grupo automaticamente...');
  
  try {
    // Buscar updates
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
    const result = await response.json();
    
    if (result.ok && result.result.length > 0) {
      // Encontrar o primeiro grupo
      const grupo = result.result.find(update => 
        update.message && 
        (update.message.chat.type === 'group' || update.message.chat.type === 'supergroup')
      );
      
      if (grupo) {
        const chatIdGrupo = grupo.message.chat.id;
        console.log(`✅ Grupo encontrado: ${grupo.message.chat.title}`);
        console.log(`✅ Chat ID do grupo: ${chatIdGrupo}`);
        
        // Atualizar o script com o novo chat ID
        console.log('📝 Atualizando script com novo Chat ID...');
        
        // Criar um novo script com o chat ID correto
        const novoScript = `
// Configuração atualizada
const CHAT_ID_DO_GRUPO = "${chatIdGrupo}";
console.log('✅ Grupo configurado:', CHAT_ID_DO_GRUPO);

// Testar envio
fetch('https://api.telegram.org/bot${TOKEN}/sendMessage', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: "${chatIdGrupo}",
    text: "✅ Grupo configurado com sucesso!\\nTodas as novas reservas serão notificadas aqui.\\n${new Date().toLocaleString('pt-BR')}",
    parse_mode: "Markdown"
  })
});
        `;
        
        console.log('\n📋 COLE ESTE CÓDIGO NO telegram-notificacao.js:');
        console.log('='.repeat(50));
        console.log(`const CHAT_ID_DO_GRUPO = "${chatIdGrupo}";`);
        console.log('='.repeat(50));
        
        return chatIdGrupo;
      } else {
        console.log('❌ Nenhum grupo encontrado nos updates.');
      }
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.notificarTelegram = notificarTelegram;
  window.testarGrupoTelegram = testarGrupoTelegram;
  window.configurarGrupoAutomatico = configurarGrupoAutomatico;
  
  console.log('✅ Funções Telegram carregadas');
  console.log('💡 Use testarGrupoTelegram() para configurar');
}