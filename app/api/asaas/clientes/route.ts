import { NextResponse } from "next/server";

export async function GET() {
  const chave = process.env.ASAAS_API_KEY;

  if (!chave) {
    return NextResponse.json(
      { erro: "ASAAS_API_KEY não encontrada." },
      { status: 500 }
    );
  }

  try {
    const resposta = await fetch(
      "https://api.asaas.com/v3/customers?limit=10",
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "User-Agent": "Bluecon CRM/1.0",
          access_token: chave,
        },
      }
    );

    const dados = await resposta.json();

    return NextResponse.json(dados, {
      status: resposta.status,
    });
  } catch (erro) {
    return NextResponse.json(
      {
        erro: "Erro ao conectar com o Asaas.",
      },
      { status: 500 }
    );
  }
}