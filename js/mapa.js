const assentos = document.querySelectorAll(".assento");

let reservas = {};

assentos.forEach(assento => {

  assento.addEventListener("click", () => {

    const id = assento.dataset.id;

    if (assento.classList.contains("ocupado")) {
      alert("❌ Este computador já está reservado.");
      return;
    }

    const confirmar = confirm("Reservar o computador " + id + "?");

    if (!confirmar) return;

    assento.classList.add("ocupado");

    reservas[id] = {
      computador: id,
      data: new Date().toLocaleString()
    };

    atualizarStats();

  });

});