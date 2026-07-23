const assentosDB = (() => {
  try {
    return JSON.parse(localStorage.getItem('lep_assentos')) || {};
  } catch { return {}; }
})();

function salvarDB() {
  localStorage.setItem('lep_assentos', JSON.stringify(assentosDB));
}

const assentosConfig = [
  // Fileira 1 (fundo) - 5 assentos
  { id: 1, x: 7, y: 5, temPC: true, nome: 'PC 01' },
  { id: 2, x: 24, y: 5, temPC: true, nome: 'PC 02' },
  { id: 3, x: 41, y: 5, temPC: true, nome: 'PC 03' },
  { id: 4, x: 58, y: 5, temPC: true, nome: 'PC 04' },
  { id: 5, x: 75, y: 5, temPC: true, nome: 'PC 05' },
  // Fileira 2
  { id: 6, x: 7, y: 19, temPC: true, nome: 'PC 06' },
  { id: 7, x: 24, y: 19, temPC: true, nome: 'PC 07' },
  { id: 8, x: 41, y: 19, temPC: true, nome: 'PC 08' },
  { id: 9, x: 58, y: 19, temPC: true, nome: 'PC 09' },
  { id: 10, x: 75, y: 19, temPC: true, nome: 'PC 10' },
  // Fileira 3
  { id: 11, x: 7, y: 33, temPC: true, nome: 'PC 11' },
  { id: 12, x: 24, y: 33, temPC: true, nome: 'PC 12' },
  { id: 13, x: 41, y: 33, temPC: true, nome: 'PC 13' },
  { id: 14, x: 58, y: 33, temPC: true, nome: 'PC 14' },
  { id: 15, x: 75, y: 33, temPC: true, nome: 'PC 15' },
  // Fileira 4
  { id: 16, x: 7, y: 47, temPC: true, nome: 'PC 16' },
  { id: 17, x: 24, y: 47, temPC: true, nome: 'PC 17' },
  { id: 18, x: 41, y: 47, temPC: true, nome: 'PC 18' },
  { id: 19, x: 58, y: 47, temPC: true, nome: 'PC 19' },
  { id: 20, x: 75, y: 47, temPC: true, nome: 'PC 20' },
  // Fileira 5 - sem PC
  { id: 21, x: 7, y: 61, temPC: false, nome: 'Mesa 21' },
  { id: 22, x: 24, y: 61, temPC: false, nome: 'Mesa 22' },
  { id: 23, x: 41, y: 61, temPC: false, nome: 'Mesa 23' },
  { id: 24, x: 58, y: 61, temPC: false, nome: 'Mesa 24' },
  { id: 25, x: 75, y: 61, temPC: false, nome: 'Mesa 25' },
  // Fileira 6 - sem PC
  { id: 26, x: 7, y: 75, temPC: false, nome: 'Mesa 26' },
  { id: 27, x: 24, y: 75, temPC: false, nome: 'Mesa 27' },
  { id: 28, x: 41, y: 75, temPC: false, nome: 'Mesa 28' },
  { id: 29, x: 58, y: 75, temPC: false, nome: 'Mesa 29' },
  { id: 30, x: 75, y: 75, temPC: false, nome: 'Mesa 30' },
];

const container = document.querySelector('.mapa-container');
const overlay = document.getElementById('camadaAssentos');
const tooltip = document.createElement('div');
tooltip.className = 'seat-tooltip';
document.body.appendChild(tooltip);

function criarAssentos() {
  overlay.innerHTML = '';
  assentosConfig.forEach((seat) => {
    const el = document.createElement('div');
    el.className = 'assento';
    el.dataset.id = seat.id;

    const status = assentosDB[seat.id]?.status || 'disponivel';
    el.dataset.status = status;

    if (!seat.temPC) {
      el.classList.add('sem-pc');
    } else if (status === 'ocupado') {
      el.classList.add('ocupado');
    } else if (status === 'reservado') {
      el.classList.add('reservado');
    }

    if (!seat.temPC) {
      el.textContent = 'M';
    } else {
      el.textContent = seat.id;
    }

    el.style.left = seat.x + '%';
    el.style.top = seat.y + '%';

    el.addEventListener('mouseenter', (e) => mostrarTooltip(e, seat));
    el.addEventListener('mouseleave', esconderTooltip);
    el.addEventListener('mousemove', moverTooltip);
    el.addEventListener('click', () => abrirModal(seat));

    overlay.appendChild(el);
  });
}

function mostrarTooltip(e, seat) {
  const status = assentosDB[seat.id]?.status || 'disponivel';
  const statusTexto = {
    disponivel: 'Disponível',
    ocupado: 'Ocupado',
    reservado: 'Reservado',
  };

  let html = `<strong>${seat.nome}</strong><br>`;
  if (seat.temPC) {
    html += `<span class="status-${status}">● ${statusTexto[status]}</span>`;
  } else {
    html += `<span style="color:#94a3b8">● Sem computador</span>`;
  }
  if (assentosDB[seat.id]?.reservadoPor) {
    html += `<br><small>Por: ${assentosDB[seat.id].reservadoPor}</small>`;
  }

  tooltip.innerHTML = html;
  tooltip.classList.add('visible');
  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = e.clientX + 15 + 'px';
  tooltip.style.top = e.clientY - 10 + 'px';
}

function moverTooltip(e) {
  tooltip.style.left = e.clientX + 15 + 'px';
  tooltip.style.top = e.clientY - 10 + 'px';
}

function esconderTooltip() {
  tooltip.classList.remove('visible');
}

const modal = document.createElement('div');
modal.className = 'seat-modal-overlay';
modal.innerHTML = `
  <div class="seat-modal">
    <button class="seat-modal-close">&times;</button>
    <div class="seat-modal-body"></div>
  </div>
`;
document.body.appendChild(modal);

modal.querySelector('.seat-modal-close').addEventListener('click', fecharModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) fecharModal();
});

function abrirModal(seat) {
  const body = modal.querySelector('.seat-modal-body');
  const status = assentosDB[seat.id]?.status || 'disponivel';
  const reserva = assentosDB[seat.id] || {};

  let html = `
    <div class="modal-seat-icon ${status}">
      ${seat.temPC ? '🖥️' : '🪑'}
    </div>
    <h2>${seat.nome}</h2>
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <span class="modal-info-label">Status</span>
        <span class="modal-info-value status-${status}">
          ${status === 'disponivel' ? '✅ Disponível' : status === 'ocupado' ? '❌ Ocupado' : '🔄 Reservado'}
        </span>
      </div>
      <div class="modal-info-item">
        <span class="modal-info-label">Tipo</span>
        <span class="modal-info-value">${seat.temPC ? '🖥️ Com computador' : '🪑 Mesa de estudo'}</span>
      </div>
      <div class="modal-info-item">
        <span class="modal-info-label">Posição</span>
        <span class="modal-info-value">Fileira ${Math.ceil(seat.id / 5)}, Assento ${((seat.id - 1) % 5) + 1}</span>
      </div>
  `;

  if (reserva.reservadoPor) {
    html += `
      <div class="modal-info-item">
        <span class="modal-info-label">Reservado por</span>
        <span class="modal-info-value">${reserva.reservadoPor}</span>
      </div>
      <div class="modal-info-item">
        <span class="modal-info-label">Data</span>
        <span class="modal-info-value">${reserva.data || '-'}</span>
      </div>
    `;
  }

  html += '</div>';

  if (status === 'disponivel' && seat.temPC) {
    html += `<button class="modal-btn-reservar" data-id="${seat.id}">Reservar</button>`;
  } else if (status === 'ocupado' || status === 'reservado') {
    html += `<button class="modal-btn-liberar" data-id="${seat.id}">Liberar assento</button>`;
  }

  body.innerHTML = html;

  body.querySelector('.modal-btn-reservar')?.addEventListener('click', () => {
    reservarAssento(seat.id);
  });
  body.querySelector('.modal-btn-liberar')?.addEventListener('click', () => {
    liberarAssento(seat.id);
  });

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function reservarAssento(id) {
  const nome = prompt('Seu nome:');
  if (!nome || !nome.trim()) return;

  assentosDB[id] = {
    status: 'ocupado',
    reservadoPor: nome.trim(),
    data: new Date().toLocaleString('pt-BR'),
  };
  salvarDB();
  atualizarTudo();
  fecharModal();
}

function liberarAssento(id) {
  if (!confirm(`Liberar o assento ${id}?`)) return;
  delete assentosDB[id];
  salvarDB();
  atualizarTudo();
  fecharModal();
}

function atualizarAssentos() {
  document.querySelectorAll('.assento').forEach((el) => {
    const id = parseInt(el.dataset.id);
    const seat = assentosConfig.find((s) => s.id === id);
    if (!seat) return;

    const status = assentosDB[id]?.status || 'disponivel';
    el.dataset.status = status;
    el.classList.remove('ocupado', 'reservado', 'disponivel');

    if (!seat.temPC) {
      el.classList.add('sem-pc');
    } else if (status === 'ocupado') {
      el.classList.add('ocupado');
    } else if (status === 'reservado') {
      el.classList.add('reservado');
    }
  });
}

function atualizarFicha() {
  let comPC = 0, semPC = 0, ocupados = 0, disponiveis = 0;

  assentosConfig.forEach((seat) => {
    if (seat.temPC) {
      comPC++;
      const status = assentosDB[seat.id]?.status || 'disponivel';
      if (status === 'ocupado' || status === 'reservado') {
        ocupados++;
      } else {
        disponiveis++;
      }
    } else {
      semPC++;
    }
  });

  const elComPC = document.querySelector('.ficha-grid .ficha-card:first-child .numero');
  const elSemPC = document.querySelector('.ficha-grid .ficha-card:last-child .numero');
  const elTotal = document.querySelector('.ficha-tecnica div[style*="font-size: 48px"]');

  if (elComPC) elComPC.textContent = comPC;
  if (elSemPC) elSemPC.textContent = semPC;
  if (elTotal) elTotal.textContent = comPC + semPC;

  let statusHTML = `
    <h4 style="margin-bottom:12px;display:flex;align-items:center;gap:8px;color:#e2e8f0;">
      <span>🔴</span> Status em Tempo Real
    </h4>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(34,197,94,0.15);border-radius:10px;border:1px solid rgba(34,197,94,0.3);">
        <span style="font-size:13px;">● Disponíveis</span>
        <span style="font-size:18px;font-weight:700;color:#22c55e;">${disponiveis}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(239,68,68,0.15);border-radius:10px;border:1px solid rgba(239,68,68,0.3);">
        <span style="font-size:13px;">● Ocupados</span>
        <span style="font-size:18px;font-weight:700;color:#ef4444;">${ocupados}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(148,163,184,0.15);border-radius:10px;border:1px solid rgba(148,163,184,0.3);">
        <span style="font-size:13px;">● Sem PC</span>
        <span style="font-size:18px;font-weight:700;color:#94a3b8;">${semPC}</span>
      </div>
    </div>
  `;

  const statusSection = document.querySelector('.ficha-tecnica .ficha-divider:last-of-type');
  if (statusSection) {
    const nextEl = statusSection.nextElementSibling;
    if (nextEl && nextEl.tagName === 'DIV' && nextEl.querySelector('h4')) {
      nextEl.outerHTML = `<div style="margin-top:5px;">${statusHTML}</div>`;
    } else {
      statusSection.insertAdjacentHTML('afterend', `<div style="margin-top:5px;">${statusHTML}</div>`);
    }
  }

  const legenda = document.querySelector('.mapa-legend');
  if (legenda) {
    const elOcupados = legenda.querySelector('.legend-item.ocupado .legend-count');
    const elDisponiveis = legenda.querySelector('.legend-item.disponivel .legend-count');
    const elSemPc = legenda.querySelector('.legend-item.sem-pc .legend-count');
    if (elOcupados) elOcupados.textContent = ocupados;
    if (elDisponiveis) elDisponiveis.textContent = disponiveis;
    if (elSemPc) elSemPc.textContent = semPC;
  }
}

function atualizarTudo() {
  atualizarAssentos();
  atualizarFicha();
}

function toggleLayout() {
  container?.classList.toggle('mapa-layout-compacto');
}

// Inicializar tooltip keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});

// Iniciar
criarAssentos();
atualizarTudo();
