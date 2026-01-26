const API_URL = "/consulta";

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("consultaForm");
  const resultado = document.getElementById("resultado");
  const historicoEl = document.getElementById("historico");

  let historico = JSON.parse(localStorage.getItem("historico")) || [];
  renderHistorico();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("codigo").value.trim();
    const nome = document.getElementById("nome").value.trim();
    const uf = document.getElementById("uf").value.trim().toUpperCase();
    const dataInicio = document.getElementById("data_inicio").value.trim();
    const dataFim = document.getElementById("data_fim").value.trim();

    // 🔒 Validações
    if (!/^\d+$/.test(codigo)) {
      alert("Código do município inválido");
      return;
    }

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dataInicio)) {
      alert("Data início inválida. Use DD.MM.AAAA");
      return;
    }

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dataFim)) {
      alert("Data fim inválida. Use DD.MM.AAAA");
      return;
    }

    const payload = {
      codigo: parseInt(codigo, 10),
      nome,
      uf,
      data_inicio: dataInicio,
      data_fim: dataFim
    };

    console.log("PAYLOAD ENVIADO AO BACKEND:", payload);
    resultado.textContent = "Consultando...";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      resultado.textContent = JSON.stringify(data, null, 2);

      // 💾 salva no histórico
      historico.unshift(data);
      localStorage.setItem("historico", JSON.stringify(historico));
      renderHistorico();

    } catch (err) {
      console.error(err);
      resultado.textContent = "Erro ao consultar backend";
    }
  });

  function renderHistorico() {
    historicoEl.innerHTML = "";

    historico.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.municipio} | ${item.periodo}`;
      li.onclick = () => {
        resultado.textContent = JSON.stringify(item, null, 2);
      };
      historicoEl.appendChild(li);
    });
  }

});

