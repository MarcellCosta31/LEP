// telegram-notificacao.js - VERSÃO PARA GITHUB PAGES

async function notificarTelegram(reserva) {
  const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
  const CHAT_ID = "8040576945";
  
  // 🔧 URL alternativa para contornar CORS no GitHub Pages
  const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  
  // 🔧 Proxy CORS para GitHub Pages (opcional)
  const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
  // OU use: "https://api.allorigins.win/raw?url="
  // OU use: "https://thingproxy.freeboard.io/fetch/"

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
    // 🔧 TENTATIVA 1: Direto (pode falhar no GitHub Pages)
    console.log('📤 Tentando conexão direta...');
    
    const payload = {
      chat_id: CHAT_ID,
      text: mensagem,
      parse_mode: "Markdown"
    };

    // Primeiro tentar direto
    try {
      const response = await fetch(TELEGRAM_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notificação enviada com sucesso!', result);
        return true;
      }
      console.log('❌ Falha direta, tentando com proxy...');
    } catch (directError) {
      console.log('🌐 Erro direto (provavelmente CORS):', directError.message);
    }

    // 🔧 TENTATIVA 2: Com proxy CORS
    console.log('🔄 Tentando com proxy CORS...');
    
    try {
      // Usar proxy para contornar CORS
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(TELEGRAM_API);
      
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        mode: 'cors' // Importante para GitHub Pages
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notificação enviada via proxy!', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Erro com proxy:', errorText);
      }
    } catch (proxyError) {
      console.error('❌ Erro com proxy CORS:', proxyError);
    }

    // 🔧 TENTATIVA 3: FormData approach (às vezes funciona melhor)
    console.log('🔧 Tentando método alternativo...');
    
    try {
      // Converter para FormData (às vezes contorna CORS)
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      formData.append('text', mensagem);
      formData.append('parse_mode', 'Markdown');
      
      const response = await fetch(TELEGRAM_API, {
        method: "POST",
        body: formData,
        mode: 'no-cors' // Modo no-cors para requests simples
      });
      
      console.log('📨 Enviado via FormData (no-cors)');
      // Não podemos ler a resposta em modo no-cors, mas o request foi enviado
      return true;
      
    } catch (formDataError) {
      console.error('❌ Erro com FormData:', formDataError);
    }

    console.error('❌ Todas as tentativas falharam');
    return false;

  } catch (error) {
    console.error('❌ Erro crítico ao enviar para Telegram:', error);
    return false;
  }
}

// 🔧 FUNÇÃO ALTERNATIVA usando JSONP (para GitHub Pages)
function notificarTelegramJSONP(reserva) {
  return new Promise((resolve) => {
    console.log('🔔 Usando método JSONP para Telegram...');
    
    // Criar callback única
    const callbackName = 'telegramCallback_' + Date.now();
    
    // Construir mensagem simplificada
    const mensagem = `NOVA RESERVA: ${reserva.responsavel} - ${reserva.turno} - ${reserva.dias ? reserva.dias[0] : ''}`;
    
    // URL Telegram com JSONP
    const TOKEN = "8599499895:AAGWYnpH6UFm0m89WblXlQpgOtQZeAAuZwQ";
    const CHAT_ID = "8040576945";
    
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(mensagem)}&parse_mode=Markdown&callback=${callbackName}`;
    
    // Criar script tag
    const script = document.createElement('script');
    script.src = url;
    
    // Definir callback global
    window[callbackName] = function(response) {
      console.log('📨 Resposta JSONP:', response);
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(true);
    };
    
    // Adicionar ao documento
    document.body.appendChild(script);
    
    // Timeout
    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        document.body.removeChild(script);
        console.log('⏰ Timeout JSONP');
        resolve(false);
      }
    }, 5000);
  });
}

// 🔧 FUNÇÃO UNIFICADA que tenta todos os métodos
async function enviarNotificacaoTelegramUnificado(reserva) {
  console.log('🔔 Enviando notificação (método unificado)...');
  
  // Tentar método principal primeiro
  try {
    const resultado = await notificarTelegram(reserva);
    if (resultado) return true;
  } catch (error) {
    console.log('❌ Método principal falhou:', error);
  }
  
  // Se falhar, tentar JSONP (funciona em mais lugares)
  try {
    const resultadoJSONP = await notificarTelegramJSONP(reserva);
    return resultadoJSONP;
  } catch (error) {
    console.log('❌ Método JSONP também falhou:', error);
  }
  
  // Se tudo falhar, pelo menos logar no console
  console.log('📋 Reserva que não foi notificada:', reserva);
  return false;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.notificarTelegram = notificarTelegram;
  window.notificarTelegramJSONP = notificarTelegramJSONP;
  window.enviarNotificacaoTelegramUnificado = enviarNotificacaoTelegramUnificado;
  
  console.log('✅ Funções Telegram carregadas para GitHub Pages');
}