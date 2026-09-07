import { NextResponse } from "next/server";

export async function GET() {
  const chave = process.env.ASAAS_API_KEY;

  if (!chave) {
    return NextResponse.json(
      { erro: "ASAAS_API_KEY não encontrada." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: "Chave do Asaas carregada com segurança.",
  });
}