"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

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
    seguradora: "",
    premio_liquido: "",
    percentual_comissao: "",
    vigencia_inicio: "",
    vigencia_fim: "",
  });
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
    "Configurações",
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

            <p className="text-sm text-slate-500">
              {cliente.telefone || "Telefone não informado"}
            </p>
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
  "Configurações",
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
    ) : (
      <div className="text-center">
        <h3 className="text-xl font-semibold">{menu}</h3>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  <div className="rounded-xl bg-slate-50 p-5">
    <p className="text-sm text-slate-500">Total de clientes</p>
    <p className="mt-2 text-2xl font-bold">{clientes.length}</p>
  </div>

  <div className="rounded-xl bg-slate-50 p-5">
    <p className="text-sm text-slate-500">Total de prêmios</p>
    <p className="mt-2 text-2xl font-bold">
      R$ {clientes.reduce((total, cliente) =>
        total + Number(cliente.premio_liquido || 0), 0
      ).toFixed(2)}
    </p>
  </div>

  <div className="rounded-xl bg-slate-50 p-5">
    <p className="text-sm text-slate-500">Total de comissões</p>
    <p className="mt-2 text-2xl font-bold">
      R$ {clientes.reduce((total, cliente) =>
        total +
        (Number(cliente.premio_liquido || 0) *
          Number(cliente.percentual_comissao || 0)) / 100, 0
      ).toFixed(2)}
    </p>
  </div>
</div>
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
