from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import urllib3
import re

urllib3.disable_warnings()

app = FastAPI()

# -------- CORS (OBRIGATÓRIO PARA FRONTEND) ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- CONFIG ----------
URL_BB = "https://demonstrativos.api.daf.bb.com.br/v1/demonstrativo/daf/consulta"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://demonstrativos.apps.bb.com.br",
    "Referer": "https://demonstrativos.apps.bb.com.br/"
}

# -------- MODELS ----------
class Consulta(BaseModel):
    codigo: int
    nome: str
    uf: str
    data_inicio: str
    data_fim: str

# -------- FUNÇÕES ----------
def consultar_bb(codigo, fundo, data_inicio, data_fim):
    payload = {
        "codigoBeneficiario": codigo,
        "codigoFundo": fundo,
        "dataInicio": data_inicio,
        "dataFim": data_fim
    }

    r = requests.post(
        URL_BB,
        headers=HEADERS,
        json=payload,
        verify=False,
        timeout=60
    )

    return r.json() if r.status_code == 200 else {}
print("PAYLOAD FINAL BB:", consultar_bb)


def extrair_credito_benef(json_data):
    if not json_data:
        return 0.0

    for item in json_data.get("quantidadeOcorrencia", []):
        nome = item.get("nomeBeneficio", "")

        if "CREDITO BENEF." in nome:
            match = re.search(r'(\d{1,3}(?:\.\d{3})*,\d{2})C', nome)
            if match:
                return float(
                    match.group(1)
                    .replace('.', '')
                    .replace(',', '.')
                )
    return 0.0

# -------- ENDPOINT ----------
@app.post("/consulta")
def consultar(consulta: Consulta):

    CODIGO_FPM = 4
    CODIGO_ROYALTIES = 28
    CODIGO_TODOS = 0

    fpm = extrair_credito_benef(
        consultar_bb(consulta.codigo, CODIGO_FPM, consulta.data_inicio, consulta.data_fim)
    )

    royalties = extrair_credito_benef(
        consultar_bb(consulta.codigo, CODIGO_ROYALTIES, consulta.data_inicio, consulta.data_fim)
    )

    todos = extrair_credito_benef(
        consultar_bb(consulta.codigo, CODIGO_TODOS, consulta.data_inicio, consulta.data_fim)
    )

    return {
        "municipio": f"{consulta.nome} - {consulta.uf}",
        "periodo": f"{consulta.data_inicio} até {consulta.data_fim}",
        "fpm": round(fpm, 2),
        "royalties": round(royalties, 2),
        "todos": round(todos, 2)
    }