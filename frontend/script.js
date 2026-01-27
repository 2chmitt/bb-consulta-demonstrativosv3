const API_URL = "/consulta";

// YYYY-MM-DD → DD.MM.AAAA
function isoParaPonto(dataIso) {
  if (!dataIso) return "";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}.${mes}.${ano}`;
}

// Número → R$
function formatarReal(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}

// Copiar por ID com feedback no botão
function copiarValorPorId(id, botao) {
  const texto = document.getElementById(id).innerText;

  navigator.clipboard.writeText(texto).then(() => {
    botao.classList.add("copiado");
    setTimeout(() => botao.classList.remove("copiado"), 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("consultaForm");

  const municipioInput = document.getElementById("municipioInput");
  const sugestoesEl = document.getElementById("sugestoes");
  const codigoHidden = document.getElementById("codigoMunicipio");
  const ufHidden = document.getElementById("ufMunicipio");

  const resMunicipio = document.getElementById("res-municipio");
  const resPeriodo = document.getElementById("res-periodo");
  const valorFpm = document.getElementById("valor-fpm");
  const valorRoyalties = document.getElementById("valor-royalties");
  const valorTodos = document.getElementById("valor-todos");

  const historicoEl = document.getElementById("historico");
  const statusEl = document.getElementById("status");
  const btnConsultar = document.getElementById("btnConsultar");

  // ===== HISTÓRICO =====
  let historico = JSON.parse(localStorage.getItem("historico")) || [];
  renderHistorico();

  function salvarNoHistorico(data) {
    historico.unshift(data);
    historico = historico.slice(0, 25);
    localStorage.setItem("historico", JSON.stringify(historico));
    renderHistorico();
  }

  function renderHistorico() {
    historicoEl.innerHTML = "";

    historico.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${normalizarMunicipio(item.municipio)} | ${item.periodo}`;
      li.title = "Clique para visualizar novamente";
      li.addEventListener("click", () => renderResultado(item));
      historicoEl.appendChild(li);
    });
  }

  // ===== AUTOCOMPLETE =====
  let timeout = null;

  municipioInput.addEventListener("input", () => {
    clearTimeout(timeout);
    codigoHidden.value = "";
    ufHidden.value = "";

    const termo = municipioInput.value.trim();
    if (termo.length < 2) {
      fecharSugestoes();
      return;
    }

    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/municipios?q=${encodeURIComponent(termo)}`);
        const dados = await res.json();

        sugestoesEl.innerHTML = "";
        if (!dados || dados.length === 0) {
          fecharSugestoes();
          return;
        }

        dados.forEach((m) => {
          const li = document.createElement("li");
          li.textContent = `${m.municipio} (${m.uf})`;
          li.addEventListener("click", () => {
            municipioInput.value = `${m.municipio} / ${m.uf}`;
            codigoHidden.value = m.codigo;
            ufHidden.value = m.uf;
            fecharSugestoes();
          });
          sugestoesEl.appendChild(li);
        });

        sugestoesEl.style.display = "block";
      } catch (err) {
        console.error(err);
        fecharSugestoes();
      }
    }, 250);
  });

  function fecharSugestoes() {
    sugestoesEl.innerHTML = "";
    sugestoesEl.style.display = "none";
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete")) fecharSugestoes();
  });

  // ===== COPIAR =====
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      copiarValorPorId(btn.dataset.copy, btn);
    });
  });

  // ===== SUBMIT =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!codigoHidden.value) {
      alert("Selecione um município da lista");
      return;
    }

    // STATUS ON
    statusEl.classList.remove("hidden");
    btnConsultar.disabled = true;
    btnConsultar.classList.add("disabled");

    // limpa valores enquanto consulta
    resMunicipio.innerText = "Consultando…";
    resPeriodo.innerText = "";
    valorFpm.innerText = "—";
    valorRoyalties.innerText = "—";
    valorTodos.innerText = "—";

    const payload = {
      codigo: Number(codigoHidden.value),
      nome: municipioInput.value,
      uf: ufHidden.value,
      data_inicio: isoParaPonto(document.getElementById("data_inicio").value),
      data_fim: isoParaPonto(document.getElementById("data_fim").value)
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      renderResultado(data);
      salvarNoHistorico(data);
    } catch (err) {
      console.error(err);
      resMunicipio.innerText = "Erro ao consultar.";
    } finally {
      // STATUS OFF
      statusEl.classList.add("hidden");
      btnConsultar.disabled = false;
      btnConsultar.classList.remove("disabled");
    }
  });

  // ===== Helpers =====
  function normalizarMunicipio(municipio) {
    const partes = municipio.replace(" - ", " / ").split(" / ");
    return `${partes[0]} / ${partes[1]}`;
  }

  function renderResultado(data) {
    resMunicipio.innerText = normalizarMunicipio(data.municipio);
    resPeriodo.innerText = data.periodo;

    valorFpm.innerText = formatarReal(data.fpm);
    valorRoyalties.innerText = formatarReal(data.royalties);
    valorTodos.innerText = formatarReal(data.todos);
  }
});
