// ✅ Caminho relativo = funciona local e online
const API_URL = "/consulta";

// Converte YYYY-MM-DD → DD.MM.AAAA
function isoParaPonto(dataIso) {
  if (!dataIso) return null;
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}.${mes}.${ano}`;
}

// Formata número para Real
function formatarReal(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}

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

    const dataInicioIso = document.getElementById("data_inicio").value;
    const dataFimIso = document.getElementById("data_fim").value;

    const dataInicio = isoParaPonto(dataInicioIso);
    const dataFim = isoParaPonto(dataFimIso);

    if (!/^\d+$/.test(codigo)) {
      alert("Código do município inválido");
      return;
    }

    if (!dataInicio || !dataFim) {
      alert("Selecione corretamente as datas");
      return;
    }

    const payload = {
      codigo: parseInt(codigo, 10),
      nome,
      uf,
      data_inicio: dataInicio,
      data_fim: dataFim
    };

    resultado.textContent = "Consultando...";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      resultado.innerHTML = `
        <div><strong>Município:</strong> ${data.municipio}</div>
        <div><strong>Período:</strong> ${data.periodo}</div>

        <ul>
          <li><strong>FPM:</strong> ${formatarReal(data.fpm)}</li>
          <li><strong>Royalties:</strong> ${formatarReal(data.royalties)}</li>
          <li><strong>Todos os Benefícios:</strong> ${formatarReal(data.todos)}</li>
        </ul>
      `;

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

    historico.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.municipio} | ${item.periodo}`;
      li.onclick = () => {
        resultado.innerHTML = `
          <div><strong>Município:</strong> ${item.municipio}</div>
          <div><strong>Período:</strong> ${item.periodo}</div>

          <ul>
            <li><strong>FPM:</strong> ${formatarReal(item.fpm)}</li>
            <li><strong>Royalties:</strong> ${formatarReal(item.royalties)}</li>
            <li><strong>Todos os Benefícios:</strong> ${formatarReal(item.todos)}</li>
          </ul>
        `;
      };
      historicoEl.appendChild(li);
    });
  }
});
