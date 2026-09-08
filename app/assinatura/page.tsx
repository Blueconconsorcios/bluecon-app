"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Assinatura() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

    async function ativarAssinatura() {
    try {
      setCarregando(true);

      const resposta = await fetch("/api/asaas/checkout", {
        method: "POST",
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        alert(
          dados.erro ||
            "Não foi possível iniciar o pagamento."
        );
        return;
      }

      if (dados.jaExiste && !dados.checkout?.url) {
  alert(
    "Sua assinatura já está ativa. Você já possui uma assinatura do Bluecon CRM."
  );
  router.push("/");
  return;
}

if (!dados.checkout?.url) {
  alert(
    "O Asaas não retornou o endereço do pagamento."
  );
  return;
}

      window.location.href = dados.checkout.url;
    } catch (erro) {
      console.error(erro);

      alert(
        "Erro ao conectar com o sistema de pagamento."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            Assinatura do CRM
          </h1>

          <p className="mt-2 text-slate-500">
            Tenha acesso completo à sua plataforma de gestão.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500">
              PLANO COMPLETO
            </p>

            <p className="mt-3 text-4xl font-bold text-slate-900">
              R$ 29,90
            </p>

            <p className="mt-1 text-slate-500">
              por mês
            </p>
          </div>

          <div className="my-8 border-t border-slate-200" />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>7 dias grátis para testar</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>1 usuário</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>Cadastro de clientes</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>Controle de apólices e renovações</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>Controle de comissões</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>Relatórios</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <span>Suporte à corretora</span>
            </div>
          </div>

          <button
            onClick={ativarAssinatura}
            disabled={carregando}
            className="mt-8 w-full rounded-xl bg-slate-950 px-5 py-4 text-lg font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Processando..." : "Assinar agora"}
          </button>

          <button
            onClick={() => router.push("/")}
            className="mt-3 w-full rounded-xl px-5 py-3 text-slate-600 hover:bg-slate-100"
          >
            Voltar para o CRM
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Você poderá cancelar sua assinatura quando quiser.
        </p>
      </div>
    </main>
  );
}