"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function Home() {
  const router = useRouter();
const [verificandoLogin, setVerificandoLogin] = useState(true);
  const [menu, setMenu] = useState("Dashboard");
  const [mensagem, setMensagem] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteEditando, setClienteEditando] = useState<any | null>(null);

  const [form, setForm] = useState({
  nome: "",
  cpf: "",
  telefone: "",
  data_nascimento: "",
  seguradora: "",
  premio_liquido: "",
  percentual_comissao: "",
  vigencia_inicio: "",
  vigencia_fim: "",
});
const calcularAniversario = (dataNascimento: string) => {
  if (!dataNascimento) return null;

  const hoje = new Date();
  const [ano, mes, dia] = dataNascimento.split("-").map(Number);

  let proximoAniversario = new Date(
    hoje.getFullYear(),
    mes - 1,
    dia
  );

  if (proximoAniversario < hoje) {
    proximoAniversario = new Date(
      hoje.getFullYear() + 1,
      mes - 1,
      dia
    );
  }

  const diferenca =
    proximoAniversario.getTime() - hoje.getTime();

  const dias = Math.ceil(
    diferenca / (1000 * 60 * 60 * 24)
  );

  return {
    dia,
    mes,
    dias,
  };
};
  const comissaoCalculada =
  (Number(form.premio_liquido || 0) *
    Number(form.percentual_comissao || 0)) /
  100;
  const dadosSeguradoras = Object.entries(
  clientes.reduce((acc: any, cliente) => {
    const seguradora =
      cliente.seguradora || "Não informada";

    acc[seguradora] = (acc[seguradora] || 0) + 1;

    return acc;
  }, {})
).map(([name, value]) => ({
  name,
  value,
}));


  const menuItems = [
    "Dashboard",
    "Clientes",
    "Novo Cliente",
    "Renovações",
    "Comissões",
    "Relatórios",
    "Contato",
  ];

  function atualizarCampo(
    campo: string,
    valor: string
  ) {
    setForm({
      ...form,
      [campo]: valor,
    });
  }

  async function carregarClientes() {
  console.log("Buscando clientes no Supabase...");

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("Clientes encontrados:", data);
  console.log("Erro:", error);

  if (error) {
    setMensagem("Erro ao carregar clientes: " + error.message);
    return;
  }

  setClientes(data || []);
}

useEffect(() => { async function verificarUsuario() { const { data: { session }, } = await supabase.auth.getSession(); if (!session) { router.replace("/login"); return; } setVerificandoLogin(false); await carregarClientes(); } verificarUsuario(); }, [router]);

  async function salvarCliente() {
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem("Digite o nome do cliente.");
      return;
    }

    let error;

const dadosCliente = {
  nome: form.nome,
  cpf: form.cpf,
  telefone: form.telefone,
  data_nascimento: form.data_nascimento || null,
  seguradora: form.seguradora,
  premio_liquido: Number(form.premio_liquido || 0),
  percentual_comissao: Number(form.percentual_comissao || 0),
  vigencia_inicio: form.vigencia_inicio || null,
  vigencia_fim: form.vigencia_fim || null,
};

if (clienteEditando) {
  const resultado = await supabase
    .from("clientes")
    .update(dadosCliente)
    .eq("id", clienteEditando.id);

  error = resultado.error;
} else {
  const resultado = await supabase
    .from("clientes")
    .insert([dadosCliente]);

  error = resultado.error;
}

    if (error) {
      console.error(error);
      setMensagem(
        "Erro ao salvar cliente: " + error.message
      );
      return;
    }

    setMensagem("✅ Cliente salvo com sucesso!");
    setClienteEditando(null);
    await carregarClientes();

    setForm({
      nome: "",
      cpf: "",
      telefone: "",
      data_nascimento: "",
      seguradora: "",
      premio_liquido: "",
      percentual_comissao: "",
      vigencia_inicio: "",
      vigencia_fim: "",
    });
  }
if (verificandoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-950">
            BLUECON
          </h1>

          <p className="mt-2 text-slate-500">
            Verificando acesso...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">

        <aside className="hidden w-64 bg-slate-950 text-white md:flex md:flex-col">
          <div className="border-b border-slate-800 p-6">
            <h1 className="text-2xl font-bold">
              SAROKA SEGUROS & BLUECON
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gestão de Seguros
            </p>
          </div>

          <nav className="flex-1 p-4">
            {menuItems.map((item) => (
              <button
                key={item}
                onClick={() => setMenu(item)}
                className={`mb-2 w-full rounded-lg px-4 py-3 text-left ${
                  menu === item
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-800 p-4">
  <button
    onClick={async () => {
      await supabase.auth.signOut();
      router.replace("/login");
    }}
    className="mb-3 w-full rounded-lg px-4 py-3 text-left text-slate-300 hover:bg-slate-800 hover:text-white"
  >
    🚪 Sair
  </button>

  <p className="text-xs text-slate-500">
    Bluecon © 2026
  </p>
</div>

        </aside>

        <section className="flex-1">

          <header className="border-b bg-white px-6 py-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Painel administrativo
            </p>

            <h2 className="text-2xl font-bold">
              {menu}
            </h2>
          </header>

          <div className="p-6">

            {menu === "Dashboard" && (
              <div>
                <h3 className="text-xl font-semibold">
                  Olá, Gustavo 👋
                </h3>

                <p className="mt-1 text-slate-500">
                  Aqui está o resumo da sua corretora.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
  <p className="text-sm text-slate-500">
    Apólices emitidas
  </p>
  <p className="mt-2 text-3xl font-bold text-slate-900">
    {clientes.length}
  </p>
</div>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
  <p className="text-sm text-slate-500">
    Renovações nos próximos 30 dias
  </p>

  <p className="mt-2 text-3xl font-bold text-slate-900">
    {(() => {
      const hoje = new Date();
      const limite = new Date();
      limite.setDate(hoje.getDate() + 30);

      return clientes.filter((cliente) => {
        if (!cliente.vigencia_fim) return false;

        const partes = cliente.vigencia_fim.split("-");
        const vencimento = new Date(
          Number(partes[0]),
          Number(partes[1]) - 1,
          Number(partes[2])
        );

        return vencimento >= hoje && vencimento <= limite;
      }).length;
    })()}
  </p>
  <div className="rounded-2xl bg-white p-5 shadow-sm">
  <h4 className="mb-4 text-lg font-semibold">
    Seguradoras vendidas
  </h4>

  {dadosSeguradoras.length === 0 ? (
    <p className="text-sm text-slate-500">
      Cadastre uma apólice para visualizar o gráfico.
    </p>
  ) : (
    <div className="flex justify-center">
      <PieChart width={320} height={280}>
        <Pie
          data={dadosSeguradoras}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label
        >
          {dadosSeguradoras.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(${index * 60}, 70%, 55%)`}
            />
          ))}
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  )}
</div>

</div>
              </div>
            )}

            {menu === "Clientes" && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <h3 className="text-xl font-semibold">
                  Clientes
                </h3>

                <p className="mt-2 text-slate-500">
  {clientes.length === 0
    ? "Seus clientes cadastrados aparecerão aqui."
    : `${clientes.length} cliente(s) cadastrado(s).`}
</p>

<div className="mt-6">
  <input
    type="text"
    placeholder="🔎 Buscar por nome, CPF ou telefone..."
    value={busca}
    onChange={(e) => setBusca(e.target.value)}
    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
  />
</div>

{clientes.length > 0 && (
  <div className="mt-6 space-y-3">
    {clientes
  .filter((cliente) => {
    const texto = busca.toLowerCase();

    return (
      cliente.nome?.toLowerCase().includes(texto) ||
      cliente.cpf?.toLowerCase().includes(texto) ||
      cliente.telefone?.toLowerCase().includes(texto)
    );
  })
  .map((cliente) => (
      <div
        key={cliente.id}
        className="rounded-xl border p-4"
      >
        <div className="flex flex-col justify-between gap-3 md:flex-row">
          <div>
            <h4 className="font-semibold">
              {cliente.nome}
            </h4>

            <div className="flex items-center gap-2">
  <p className="text-sm text-slate-500">
    {cliente.telefone || "Telefone não informado"}
  </p>

  {cliente.telefone && (
    <a
      href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
      title="Conversar pelo WhatsApp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M12.04 2a9.93 9.93 0 0 0-8.55 15.03L2 22l5.13-1.34A9.93 9.93 0 1 0 12.04 2Zm0 17.93a8 8 0 0 1-4.08-1.12l-.29-.17-3.05.8.81-2.97-.19-.3a8 8 0 1 1 6.8 3.76Zm4.38-5.99c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
      </svg>
    </a>
  )}
  {cliente.data_nascimento && (() => {
  const aniversario = calcularAniversario(cliente.data_nascimento);

  if (!aniversario) return null;

  return (
    <p className="mt-1 text-sm text-slate-500">
      🎂 Aniversário: {String(aniversario.dia).padStart(2, "0")}/
      {String(aniversario.mes).padStart(2, "0")}
      {" • "}
      {aniversario.dias === 0
        ? "Hoje!"
        : aniversario.dias === 1
        ? "Amanhã"
        : `em ${aniversario.dias} dias`}
    </p>
  );
})()}
</div>
          </div>

          <div className="text-left md:text-right">
            <p className="font-medium">
              {cliente.seguradora || "Seguradora não informada"}
            </p>

            <p className="text-sm text-slate-500">
              Prêmio: R$ {Number(cliente.premio_liquido || 0).toFixed(2)}
            </p>
            <button
  onClick={() => {
  setClienteEditando(cliente);
  setForm({
  nome: cliente.nome || "",
  cpf: cliente.cpf || "",
  telefone: cliente.telefone || "",
  data_nascimento: cliente.data_nascimento || "",
  seguradora: cliente.seguradora || "",
  premio_liquido: cliente.premio_liquido?.toString() || "",
  percentual_comissao: cliente.percentual_comissao?.toString() || "",
  vigencia_inicio: cliente.vigencia_inicio || "",
  vigencia_fim: cliente.vigencia_fim || "",
});
  setMenu("Novo Cliente");
}}
  className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
>
  ✏️ Editar
</button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

              

                <button
                  onClick={() => setMenu("Novo Cliente")}
                  className="mt-6 rounded-lg bg-slate-950 px-5 py-3 font-medium text-white"
                >
                  + Novo Cliente
                </button>

              </div>
            )}

            {menu === "Novo Cliente" && (
              <div className="max-w-4xl rounded-2xl bg-white p-6 shadow-sm">

                <h3 className="text-xl font-semibold">
                  Cadastrar novo cliente
                </h3>

                <div className="mt-6 grid gap-4 md:grid-cols-2">

                  <input
                    className="rounded-lg border p-3"
                    placeholder="Nome completo"
                    value={form.nome}
                    onChange={(e) =>
                      atualizarCampo("nome", e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg border p-3"
                    placeholder="CPF"
                    value={form.cpf}
                    onChange={(e) =>
                      atualizarCampo("cpf", e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg border p-3"
                    placeholder="Telefone"
                    value={form.telefone}
                    onChange={(e) =>
                      atualizarCampo("telefone", e.target.value)
                    }
                  />
                  <input
  type="date"
  className="rounded-lg border p-3"
  value={form.data_nascimento}
  onChange={(e) =>
    atualizarCampo("data_nascimento", e.target.value)
  }
/>

                  <input
                    className="rounded-lg border p-3"
                    placeholder="Seguradora"
                    value={form.seguradora}
                    onChange={(e) =>
                      atualizarCampo("seguradora", e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg border p-3"
                    placeholder="Prêmio líquido"
                    type="number"
                    value={form.premio_liquido}
                    onChange={(e) =>
                      atualizarCampo(
                        "premio_liquido",
                        e.target.value
                      )
                    }
                  />

                  <input
                    className="rounded-lg border p-3"
                    placeholder="Comissão %"
                    type="number"
                    value={form.percentual_comissao}
                    onChange={(e) =>
                      atualizarCampo(
                        "percentual_comissao",
                        e.target.value
                      )
                    }
                  />
                  <div className="mt-3 rounded-xl bg-slate-50 p-4">
  <p className="text-sm text-slate-500">Comissão calculada</p>
  <p className="text-lg font-semibold text-slate-900">
    R$ {comissaoCalculada.toFixed(2)}
  </p>
</div>

                  <div>
                    <label className="mb-1 block text-sm">
                      Início da vigência
                    </label>

                    <input
                      type="date"
                      className="w-full rounded-lg border p-3"
                      value={form.vigencia_inicio}
                      onChange={(e) =>
                        atualizarCampo(
                          "vigencia_inicio",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm">
                      Fim da vigência
                    </label>

                    <input
                      type="date"
                      className="w-full rounded-lg border p-3"
                      value={form.vigencia_fim}
                      onChange={(e) =>
                        atualizarCampo(
                          "vigencia_fim",
                          e.target.value
                        )
                      }
                    />
                  </div>

                </div>

                {mensagem && (
                  <div className="mt-5 rounded-lg border p-4">
                    {mensagem}
                  </div>
                )}

                <button
                  onClick={salvarCliente}
                  className="mt-6 rounded-lg bg-slate-950 px-6 py-3 font-medium text-white hover:bg-slate-800"
                >
                  Salvar cliente
                </button>

              </div>
            )}

            {[
  "Renovações",
  "Comissões",
  "Relatórios",
  "Contato",
].includes(menu) && (
  <div className="rounded-2xl bg-white p-8">
    {menu === "Renovações" ? (
  <div>
    <h3 className="text-xl font-semibold">Renovações 📅</h3>

    <p className="mt-1 text-slate-500">
      Acompanhe as apólices próximas do vencimento.
    </p>

    <div className="mt-6 rounded-xl bg-slate-50 p-5">
          {(() => {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + 30);

  const renovacoes = clientes.filter((cliente) => {
    if (!cliente.vigencia_fim) return false;

    const partes = cliente.vigencia_fim.split("-");
    const vencimento = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    return vencimento >= hoje && vencimento <= limite;
  });

  if (renovacoes.length === 0) {
    return (
      <p className="text-slate-600">
        Nenhuma renovação nos próximos 30 dias.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {renovacoes.map((cliente) => (
        <div
          key={cliente.id}
          className="rounded-xl border bg-white p-4"
        >
          <h4 className="font-semibold">
            {cliente.nome}
          </h4>

          <p className="text-sm text-slate-500">
            {cliente.seguradora || "Seguradora não informada"}
          </p>

          <p className="mt-2 text-sm font-medium">
            Vencimento:{" "}
            {new Date(
              cliente.vigencia_fim + "T00:00:00"
            ).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
})()}
    </div>
  </div>
) : menu === "Comissões" ? (
      <div>
        <h3 className="text-xl font-semibold">Comissões 💰</h3>

        <p className="mt-1 text-slate-500">
          Resumo das comissões da sua corretora.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Total de clientes
            </p>

            <p className="mt-2 text-2xl font-bold">
              {clientes.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Total de comissões
            </p>

            <p className="mt-2 text-2xl font-bold">
              R${" "}
              {clientes
                .reduce(
                  (total, cliente) =>
                    total +
                    (Number(cliente.premio_liquido || 0) *
                      Number(cliente.percentual_comissao || 0)) /
                      100,
                  0
                )
                .toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-6">
  <h4 className="mb-4 text-lg font-semibold">
    Comissões por cliente
  </h4>

  <div className="space-y-3">
    {clientes.map((cliente) => {
      const comissao =
        (Number(cliente.premio_liquido || 0) *
          Number(cliente.percentual_comissao || 0)) /
        100;

      return (
        <div
          key={cliente.id}
          className="rounded-xl border bg-white p-4"
        >
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <div>
              <h5 className="font-semibold">
                {cliente.nome}
              </h5>

              <p className="text-sm text-slate-500">
                {cliente.seguradora || "Seguradora não informada"}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm text-slate-500">
                Prêmio: R${" "}
                {Number(cliente.premio_liquido || 0).toFixed(2)}
              </p>

              <p className="text-sm text-slate-500">
                Comissão: {Number(cliente.percentual_comissao || 0)}%
              </p>

              <p className="mt-1 font-semibold">
                Ganho: R$ {comissao.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
      </div>
    ) : menu === "Relatórios" ? (
  <div>
    <h3 className="text-xl font-semibold">
      Relatórios 📊
    </h3>

    <p className="mt-1 text-slate-500">
      Gere relatórios da sua corretora por período.
    </p>

    <div className="mt-6 grid gap-6 md:grid-cols-2">

      <div className="rounded-xl border bg-slate-50 p-5">
        <h4 className="text-lg font-semibold">
          Relatório de Comissões
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Consulte o total de comissões por período.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm">
            Data inicial
          </label>

          <input
            type="date"
            id="relatorioComissaoInicio"
            className="w-full rounded-lg border bg-white p-3"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm">
            Data final
          </label>

          <input
            type="date"
            id="relatorioComissaoFim"
            className="w-full rounded-lg border bg-white p-3"
          />
        </div>

        <button
          onClick={() => {
  const inicio = (
    document.getElementById(
      "relatorioComissaoInicio"
    ) as HTMLInputElement
  ).value;

  const fim = (
    document.getElementById(
      "relatorioComissaoFim"
    ) as HTMLInputElement
  ).value;

  if (!inicio || !fim) {
    alert("Selecione a data inicial e a data final.");
    return;
  }

  const clientesPeriodo = clientes.filter((cliente) => {
    if (!cliente.vigencia_inicio) return false;

    return (
      cliente.vigencia_inicio >= inicio &&
      cliente.vigencia_inicio <= fim
    );
  });

  const totalComissoes = clientesPeriodo.reduce(
    (total, cliente) =>
      total +
      (Number(cliente.premio_liquido || 0) *
        Number(cliente.percentual_comissao || 0)) /
        100,
    0
  );

  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text("SAROKA SEGUROS & BLUECON", 14, 20);

  pdf.setFontSize(12);
  pdf.text("Relatório de Comissões", 14, 30);

  pdf.setFontSize(10);
  pdf.text(
    `Período: ${inicio.split("-").reverse().join("/")} a ${fim
      .split("-")
      .reverse()
      .join("/")}`,
    14,
    38
  );

  autoTable(pdf, {
    startY: 45,
    head: [["Cliente", "Seguradora", "Prêmio", "Comissão"]],
    body: clientesPeriodo.map((cliente) => {
      const comissao =
        (Number(cliente.premio_liquido || 0) *
          Number(cliente.percentual_comissao || 0)) /
        100;

      return [
        cliente.nome || "",
        cliente.seguradora || "Não informada",
        `R$ ${Number(
          cliente.premio_liquido || 0
        ).toFixed(2)}`,
        `R$ ${comissao.toFixed(2)}`,
      ];
    }),
  });

  const paginaFinal =
    (pdf as any).lastAutoTable.finalY + 10;

  pdf.setFontSize(12);
  pdf.text(
    `Total de comissões: R$ ${totalComissoes.toFixed(2)}`,
    14,
    paginaFinal
  );

  pdf.save("relatorio-comissoes.pdf");
}}
          className="mt-5 w-full rounded-lg bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
        >
          📄 Baixar PDF de Comissões
        </button>
      </div>

      <div className="rounded-xl border bg-slate-50 p-5">
        <h4 className="text-lg font-semibold">
          Relatório de Clientes
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Liste os clientes cadastrados em determinado período.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm">
            Data inicial
          </label>

          <input
            type="date"
            id="relatorioClientesInicio"
            className="w-full rounded-lg border bg-white p-3"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm">
            Data final
          </label>

          <input
            type="date"
            id="relatorioClientesFim"
            className="w-full rounded-lg border bg-white p-3"
          />
        </div>

        <button
          onClick={() => {
  const inicio = (
    document.getElementById(
      "relatorioClientesInicio"
    ) as HTMLInputElement
  ).value;

  const fim = (
    document.getElementById(
      "relatorioClientesFim"
    ) as HTMLInputElement
  ).value;

  if (!inicio || !fim) {
    alert("Selecione a data inicial e a data final.");
    return;
  }

  const clientesPeriodo = clientes.filter((cliente) => {
    if (!cliente.vigencia_inicio) return false;

    return (
      cliente.vigencia_inicio >= inicio &&
      cliente.vigencia_inicio <= fim
    );
  });

  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text("SAROKA SEGUROS & BLUECON", 14, 20);

  pdf.setFontSize(12);
  pdf.text("Relatório de Clientes", 14, 30);

  pdf.setFontSize(10);
  pdf.text(
    `Período: ${inicio.split("-").reverse().join("/")} a ${fim
      .split("-")
      .reverse()
      .join("/")}`,
    14,
    38
  );

  autoTable(pdf, {
    startY: 45,
    head: [["Cliente", "Telefone"]],
    body: clientesPeriodo.map((cliente) => [
      cliente.nome || "",
      cliente.telefone || "Não informado",
    ]),
  });

  pdf.save("relatorio-clientes.pdf");
}}
          className="mt-5 w-full rounded-lg bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
        >
          📄 Baixar PDF de Clientes
        </button>
      </div>

    </div>
  </div>
) : menu === "Contato" ? (
  <div className="max-w-4xl">
    <h3 className="text-2xl font-bold text-slate-900">
      Contato 📞
    </h3>

    <p className="mt-1 text-slate-500">
      Entre em contato com a SAROKA SEGUROS & BLUECON.
    </p>

    <div className="mt-6 grid gap-5 md:grid-cols-2">

      <div className="rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-medium text-slate-500">
          📍 Endereço
        </p>

        <p className="mt-2 font-semibold text-slate-900">
          Av. Inconfidência Mineira, 138
        </p>

        <p className="text-slate-600">
          Sala 12
        </p>

        <a
          href="https://share.google/cKwq3yIPoXt7yteLC"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-lg bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
        >
          🗺️ Abrir no Google Maps
        </a>
      </div>

      <div className="rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-medium text-slate-500">
          ☎️ Telefone
        </p>

        <a
          href="tel:+551129169557"
          className="mt-2 block font-semibold text-blue-600 hover:underline"
        >
          (11) 2916-9557
        </a>
      </div>

      <div className="rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-medium text-slate-500">
          💬 WhatsApp
        </p>

        <a
          href="https://wa.me/5511940143313"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block font-semibold text-blue-600 hover:underline"
        >
          (11) 94014-3313
        </a>

        <a
          href="https://wa.me/5511941053336"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block font-semibold text-blue-600 hover:underline"
        >
          (11) 94105-3336
        </a>
      </div>

      <div className="rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-medium text-slate-500">
          📧 E-mail
        </p>

        <a
          href="mailto:Blueconfinanciamentos@outlook.com.br"
          className="mt-2 block break-all font-semibold text-blue-600 hover:underline"
        >
          Blueconfinanciamentos@outlook.com.br
        </a>
      </div>

      <div className="rounded-2xl bg-slate-50 p-6 md:col-span-2">
        <p className="text-sm font-medium text-slate-500">
          🏢 CNPJ
        </p>

        <p className="mt-2 font-semibold text-slate-900">
          53.148.614/0001-81
        </p>
      </div>

    </div>
  </div>
) : (
  <div className="text-center">
    <h3 className="text-xl font-semibold">
      {menu}
    </h3>
  </div>
)}

  </div>
)}

          </div>
        </section>
      </div>
    </main>
  );
}
