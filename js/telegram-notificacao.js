// telegram-notificacao.js - VERSÃO FINAL (JÁ TESTADA E FUNCIONANDO)

async function notificarTelegram(reserva) {
  const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
  const CHAT_ID = "8040576945"; // Este está CORRETO e funcionando!

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
    ? (reserva.justificativaNoite.length > 100 ? reserva.justificativaNoite.substring(0, 100) + '...' : reserva.justificativaNoite)
    : '';

  const mensagem = `📅 *NOVA RESERVA NO LEP*

👤 *Responsável:* ${reserva.responsavel}
📧 *Email:* ${reserva.email}
📱 *WhatsApp:* ${reserva.whatsapp}
🕒 *Turno:* ${turnoFormatado}
📆 *Datas:* ${datasFormatadas}
📋 *Ocupação:* ${ocupacaoFormatada}
🎯 *Finalidade:* ${finalidadeTruncada}

${reserva.turno === 'noite' ? '⚠️ *ATENÇÃO: Turno da noite - Necessita aprovação*' : '✅ *Reserva aprovada automaticamente*'}
${reserva.justificativaNoite ? `📝 *Justificativa:* ${justificativaTruncada}` : ''}

📊 *Status:* ${reserva.status === 'aprovado' ? 'APROVADO ✅' : 'PENDENTE ⏳'}
⏰ *Criado em:* ${new Date().toLocaleString('pt-BR')}`;

  console.log('Mensagem formatada:', mensagem);

  try {
    // Enviar com Markdown (agora sabemos que funciona)
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensagem,
        parse_mode: "Markdown" // Usando Markdown normal
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na resposta do Telegram:', result);
      
      // Fallback: tentar sem formatação
      console.log('🔄 Tentando sem formatação...');
      
      const mensagemSemFormatacao = mensagem
        .replace(/\*/g, '') // Remover asteriscos
        .replace(/📅/g, '📅')
        .replace(/👤/g, '👤')
        .replace(/📧/g, '📧')
        .replace(/📱/g, '📱')
        .replace(/🕒/g, '🕒')
        .replace(/📆/g, '📆')
        .replace(/📋/g, '📋')
        .replace(/🎯/g, '🎯')
        .replace(/⚠️/g, '⚠️')
        .replace(/✅/g, '✅')
        .replace(/📝/g, '📝')
        .replace(/📊/g, '📊')
        .replace(/⏰/g, '⏰');
      
      const responseFallback = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: mensagemSemFormatacao
        })
      });
      
      const resultFallback = await responseFallback.json();
      
      if (!responseFallback.ok) {
        console.error('❌ Falha também no fallback:', resultFallback);
      } else {
        console.log('✅ Notificação enviada (sem formatação)');
      }
    } else {
      console.log('✅ Notificação enviada com sucesso!');
      console.log('Resultado:', result);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar para Telegram:', error);
    // Não interrompe o fluxo principal
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.notificarTelegram = notificarTelegram;
  console.log('✅ Função notificarTelegram carregada e pronta');
}

// 🔧 FUNÇÃO DE TESTE (para debug)
if (typeof window !== 'undefined') {
  window.testarTelegram = async function() {
    console.log('🧪 Testando função notificarTelegram...');
    
    const reservaTeste = {
      responsavel: "João Silva (TESTE)",
      email: "joao@teste.com",
      whatsapp: "(11) 99999-9999",
      turno: "manha",
      dias: ["2026-02-20", "2026-02-21"],
      ocupacao: "docente_fei",
      finalidade: "Aula de Programação para turma de Engenharia",
      status: "aprovado",
      justificativaNoite: ""
    };
    
    await notificarTelegram(reservaTeste);
  };
}