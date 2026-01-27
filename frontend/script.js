const API_URL = "/consulta";

// ===== util =====
function isoParaPonto(dataIso) {
  if (!dataIso) return null;
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}.${mes}.${ano}`;
}

function formatarReal(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}

// ===== main =====
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("consultaForm");
  const resultado = document.getElementById("resultado");
  const historicoEl = document.getElementById("historico");

  const municipioInput = document.getElementById("municipioInput");
  const sugestoesEl = document.getElementById("sugestoes");
  const autocompleteWrapper = municipioInput?.closest(".autocomplete");

  // ✅ garante hidden inputs (se não existirem, cria)
  let codigoHidden = document.getElementById("codigoMunicipio");
  if (!codigoHidden) {
    codigoHidden = document.createElement("input");
    codigoHidden.type = "hidden";
    codigoHidden.id = "codigoMunicipio";
    form.appendChild(codigoHidden);
  }

  let ufHidden = document.getElementById("ufMunicipio");
  if (!ufHidden) {
    ufHidden = document.createElement("input");
    ufHidden.type = "hidden";
    ufHidden.id = "ufMunicipio";
    form.appendChild(ufHidden);
  }

  // ✅ validação: se faltar algo essencial, mostra erro no console e não quebra tudo
  if (!form || !resultado || !historicoEl || !municipioInput || !sugestoesEl || !autocompleteWrapper) {
    console.error("ERRO: Elementos do autocomplete não encontrados. Confira IDs no index.html.", {
      form: !!form,
      resultado: !!resultado,
      historicoEl: !!historicoEl,
      municipioInput: !!municipioInput,
      sugestoesEl: !!sugestoesEl,
      autocompleteWrapper: !!autocompleteWrapper
    });
    return;
  }

  // ===== histórico =====
  let historico = JSON.parse(localStorage.getItem("historico")) || [];
  renderHistorico();

  // ===== funções autocomplete =====
  function abrirSugestoes() {
    sugestoesEl.style.display = "block";
  }

  function fecharSugestoes() {
    sugestoesEl.innerHTML = "";
    sugestoesEl.style.display = "none";
  }

  // começa fechada
  fecharSugestoes();

  let timeout = null;

  municipioInput.addEventListener("input", () => {
    clearTimeout(timeout);

    // invalida seleção anterior ao digitar
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
        if (!res.ok) {
          console.error("Erro /municipios:", res.status, res.statusText);
          fecharSugestoes();
          return;
        }

        const dados = await res.json();

        sugestoesEl.innerHTML = "";

        if (!Array.isArray(dados) || dados.length === 0) {
          fecharSugestoes();
          return;
        }

        dados.forEach((m) => {
          const li = document.createElement("li");
          li.textContent = `${m.municipio} (${m.uf})`;

          li.addEventListener("click", () => {
            municipioInput.value = `${m.municipio} (${m.uf})`;
            codigoHidden.value = m.codigo;
            ufHidden.value = m.uf;
            fecharSugestoes();
          });

          sugestoesEl.appendChild(li);
        });

        abrirSugestoes();
      } catch (err) {
        console.error("Erro ao buscar municípios:", err);
        fecharSugestoes();
      }
    }, 250);
  });

  // fecha ao clicar fora do bloco do autocomplete
  document.addEventListener("click", (e) => {
    if (!autocompleteWrapper.contains(e.target)) {
      fecharSugestoes();
    }
  });

  // opcional: se clicar no input, reabre se já tiver sugestões carregadas
  municipioInput.addEventListener("focus", () => {
    if (sugestoesEl.children.length > 0) abrirSugestoes();
  });

  // ===== submit =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!codigoHidden.value) {
      alert("Selecione um município da lista");
      return;
    }

    const dataInicioIso = document.getElementById("data_inicio").value;
    const dataFimIso = document.getElementById("data_fim").value;

    const dataInicio = isoParaPonto(dataInicioIso);
    const dataFim = isoParaPonto(dataFimIso);

    if (!dataInicio || !dataFim) {
      alert("Selecione corretamente as datas");
      return;
    }

    const payload = {
      codigo: parseInt(codigoHidden.value, 10),
      nome: municipioInput.value,
      uf: ufHidden.value,
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
      console.error("Erro ao consultar backend:", err);
      resultado.textContent = "Erro ao consultar backend";
    }
  });

  function renderHistorico() {
    historicoEl.innerHTML = "";
    historico.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.municipio} | ${item.periodo}`;
      li.addEventListener("click", () => {
        resultado.innerHTML = `
          <div><strong>Município:</strong> ${item.municipio}</div>
          <div><strong>Período:</strong> ${item.periodo}</div>
          <ul>
            <li><strong>FPM:</strong> ${formatarReal(item.fpm)}</li>
            <li><strong>Royalties:</strong> ${formatarReal(item.royalties)}</li>
            <li><strong>Todos os Benefícios:</strong> ${formatarReal(item.todos)}</li>
          </ul>
        `;
      });
      historicoEl.appendChild(li);
    });
  }
});
