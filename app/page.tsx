"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [verificandoLogin, setVerificandoLogin] = useState(true);
  const [menu, setMenu] = useState("Dashboard");
  const [mensagem, setMensagem] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [totalApolices, setTotalApolices] = useState(0);
  const [busca, setBusca] = useState("");
  const [clienteEditando, setClienteEditando] = useState<any | null>(null);
  const [clienteVisualizando, setClienteVisualizando] = useState<any | null>(null);
  const [documentosCliente, setDocumentosCliente] = useState<any[]>([]);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("Minha Empresa");
  const [assinaturaAtiva, setAssinaturaAtiva] = useState<boolean | null>(null);
  const [dadosAssinatura, setDadosAssinatura] = useState<any | null>(null);

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

const [leads, setLeads] = useState<any[]>([]);
const [novoLeadAberto, setNovoLeadAberto] = useState(false);
const [leadEditando, setLeadEditando] = useState<any | null>(null);
const [leadForm, setLeadForm] = useState({
  nome: "",
  telefone: "",
  produto: "Seguro Auto e Moto",
  etapa: "Em atendimento",
});
const [carregandoLeads, setCarregandoLeads] = useState(false);
const [leadEmConversao, setLeadEmConversao] = useState<any | null>(null);

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
  const dadosSeguradoras = Object.values(
  clientes.reduce((acc: any, cliente) => {
    const original =
      cliente.seguradora?.trim() || "Não informada";

    const chave = original
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

    if (!acc[chave]) {
      acc[chave] = {
        name: original,
        value: 0,
      };
    }

    acc[chave].value += 1;

    return acc;
  }, {})
);

const renderLabelSeguradora = (props: any) => {
  const {
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    name,
    value,
  } = props;

  const RADIAN = Math.PI / 180;

  const radius = outerRadius + 45;

  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const total = dadosSeguradoras.reduce(
    (soma: number, item: any) => soma + Number(item.value),
    0
  );

  const percentual = total
    ? ((Number(value) / total) * 100).toFixed(1)
    : "0.0";

  const textoX = x + (x > cx ? 10 : -10);

  return (
    <g>
      <line
        x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
        y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
        x2={x}
        y2={y}
        stroke="#64748b"
        strokeWidth={1.5}
      />

      <circle
        cx={x}
        cy={y}
        r={4}
        fill="#64748b"
      />

      <text
        x={textoX}
        y={y - 6}
        textAnchor={x > cx ? "start" : "end"}
        fill="#0f172a"
        fontSize={14}
        fontWeight={700}
      >
        {name}
      </text>

      <text
        x={textoX}
        y={y + 14}
        textAnchor={x > cx ? "start" : "end"}
        fill="#64748b"
        fontSize={13}
      >
        {value} ({percentual}%)
      </text>
    </g>
  );
};
  const menuItems = [
  "Dashboard",
  "Clientes",
  "Cadastrar Venda",
  "Leads",
  "Renovações",
  "Comissões",
  "Relatórios",
  "Suporte à Corretora",
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

setTotalApolices((data || []).length);
}
async function carregarDocumentos(clienteId: string) {
  const { data, error } = await supabase
    .from("documentos_clientes")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar documentos:", error);
    setDocumentosCliente([]);
    return;
  }

  setDocumentosCliente(data || []);
}

async function enviarDocumento(clienteId: string, arquivo: File) {
  setEnviandoDocumento(true);
  setMensagem("");

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMensagem("Usuário não autenticado.");
      return;
    }

    const { data: vinculoEmpresa, error: erroEmpresa } = await supabase
      .from("usuarios_empresa")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (erroEmpresa || !vinculoEmpresa) {
      setMensagem("Não foi possível identificar a empresa.");
      return;
    }

    const empresaId = vinculoEmpresa.empresa_id;

    const nomeSeguro = arquivo.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const caminhoArquivo =
      `${empresaId}/${clienteId}/${Date.now()}-${nomeSeguro}`;

    const { error: erroUpload } = await supabase.storage
      .from("documentos-clientes")
      .upload(caminhoArquivo, arquivo);

    if (erroUpload) {
      console.error("Erro ao enviar arquivo:", erroUpload);
      setMensagem(
        "Erro ao enviar o documento: " + erroUpload.message
      );
      return;
    }

    const { error: erroDocumento } = await supabase
      .from("documentos_clientes")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteId,
          nome_arquivo: arquivo.name,
          caminho_arquivo: caminhoArquivo,
          tipo_arquivo: arquivo.type,
          tamanho_arquivo: arquivo.size,
        },
      ]);

    if (erroDocumento) {
      console.error(
        "Erro ao registrar documento:",
        erroDocumento
      );

      await supabase.storage
        .from("documentos-clientes")
        .remove([caminhoArquivo]);

      setMensagem(
        "O arquivo foi enviado, mas não foi possível registrá-lo."
      );
      return;
    }

    await carregarDocumentos(clienteId);

    setMensagem("✅ Documento enviado com sucesso!");
  } finally {
    setEnviandoDocumento(false);
  }
}
async function baixarDocumento(documento: any) {
  const { data, error } = await supabase.storage
    .from("documentos-clientes")
    .download(documento.caminho_arquivo);

  if (error) {
    console.error("Erro ao baixar documento:", error);
    setMensagem("Erro ao baixar o documento.");
    return;
  }

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");

  link.href = url;
  link.download = documento.nome_arquivo;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function excluirDocumento(documento: any) {
  const confirmar = window.confirm(
    `Deseja realmente excluir o documento "${documento.nome_arquivo}"?`
  );

  if (!confirmar) return;

  setMensagem("");

  const { error: erroStorage } = await supabase.storage
    .from("documentos-clientes")
    .remove([documento.caminho_arquivo]);

  if (erroStorage) {
    console.error("Erro ao excluir arquivo:", erroStorage);
    setMensagem("Erro ao excluir o arquivo.");
    return;
  }

  const { error: erroBanco } = await supabase
    .from("documentos_clientes")
    .delete()
    .eq("id", documento.id);

  if (erroBanco) {
    console.error("Erro ao excluir registro:", erroBanco);
    setMensagem(
      "O arquivo foi removido, mas houve erro ao excluir o registro."
    );
    return;
  }

  if (clienteVisualizando) {
    await carregarDocumentos(clienteVisualizando.id);
  }

  setMensagem("✅ Documento excluído com sucesso!");
}

async function carregarEmpresa() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return;

  const { data: usuarioEmpresa, error: erroUsuario } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("id", session.user.id)
    .single();

  if (erroUsuario || !usuarioEmpresa) {
    console.error("Erro ao encontrar empresa:", erroUsuario);
    return;
  }

  const { data: empresa, error: erroEmpresa } = await supabase
    .from("empresas")
    .select("nome")
    .eq("id", usuarioEmpresa.empresa_id)
    .single();

  if (erroEmpresa || !empresa) {
    console.error("Erro ao carregar empresa:", erroEmpresa);
    return;
  }

  setEmpresaNome(empresa.nome);
}
async function carregarLeads() {
  setCarregandoLeads(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: vinculoEmpresa, error: erroEmpresa } = await supabase
      .from("usuarios_empresa")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (erroEmpresa || !vinculoEmpresa) {
      console.error("Erro ao identificar empresa dos leads:", erroEmpresa);
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("empresa_id", vinculoEmpresa.empresa_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar leads:", error);
      return;
    }

    setLeads(data || []);
  } finally {
    setCarregandoLeads(false);
  }
}
useEffect(() => {
  async function verificarUsuario() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const { data: assinatura, error: erroAssinatura } =
  await supabase.rpc("minha_assinatura_ativa");

console.log("🔐 Assinatura ativa:", assinatura);
console.log("🔐 Erro ao verificar assinatura:", erroAssinatura);

setAssinaturaAtiva(assinatura === true);

const { data: dados, error: erroDadosAssinatura } =
  await supabase.rpc("minha_assinatura");

console.log("📋 Dados da assinatura:", dados);
console.log("📋 Erro ao buscar dados da assinatura:", erroDadosAssinatura);

if (!erroDadosAssinatura && dados && dados.length > 0) {
  setDadosAssinatura(dados[0]);
}

    await carregarEmpresa();
    await carregarClientes();
    await carregarLeads();

setVerificandoLogin(false);
  }

  verificarUsuario();
}, [router]);
  async function salvarCliente() {
    setMensagem("");

    if (!form.nome.trim()) {
      setMensagem("Digite o nome do cliente.");
      return;
    }

    let error;
let clienteCriadoId: string | null = null;

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
  // Descobrir o usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setMensagem("Usuário não autenticado.");
    return;
  }

  // Descobrir a empresa desse usuário
  const { data: vinculoEmpresa, error: erroEmpresa } = await supabase
    .from("usuarios_empresa")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (erroEmpresa || !vinculoEmpresa) {
    console.error("Erro ao encontrar empresa:", erroEmpresa);
    setMensagem("Não foi possível identificar a empresa do usuário.");
    return;
  }

  // Criar cliente vinculado à empresa
  const resultado = await supabase
  .from("clientes")
  .insert([
    {
      ...dadosCliente,
      empresa_id: vinculoEmpresa.empresa_id,
    },
  ])
  .select("id")
  .single();

error = resultado.error;

if (!error && resultado.data) {
  clienteCriadoId = resultado.data.id;
}
}


    if (error) {
      console.error(error);
      setMensagem(
        "Erro ao salvar cliente: " + error.message
      );
      return;
    }

    setMensagem("✅ Cliente salvo com sucesso!");

if (!clienteEditando && leadEmConversao && clienteCriadoId) {
  const { error: erroConversao } = await supabase
    .from("leads")
    .update({
      etapa: "Convertido",
      cliente_id: clienteCriadoId,
    })
    .eq("id", leadEmConversao.id);

  if (erroConversao) {
    console.error("Erro ao converter lead:", erroConversao);
  } else {
    await carregarLeads();
    setLeadEmConversao(null);
  }
}

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
  async function salvarLead() {
  setMensagem("");

  if (!leadForm.nome.trim()) {
    setMensagem("Digite o nome do lead.");
    return;
  }

  if (!leadForm.telefone.trim()) {
    setMensagem("Digite o telefone do lead.");
    return;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMensagem("Usuário não identificado.");
      return;
    }

    const { data: vinculoEmpresa, error: erroEmpresa } = await supabase
      .from("usuarios_empresa")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (erroEmpresa || !vinculoEmpresa) {
      console.error("Erro ao identificar empresa do lead:", erroEmpresa);
      setMensagem("Não foi possível identificar a empresa.");
      return;
    }

    let error;

if (leadEditando) {
  const resultado = await supabase
    .from("leads")
    .update({
      nome: leadForm.nome.trim(),
      telefone: leadForm.telefone.trim(),
      produto: leadForm.produto,
      etapa: leadForm.etapa,
    })
    .eq("id", leadEditando.id)
    .eq("empresa_id", vinculoEmpresa.empresa_id);

  error = resultado.error;
} else {
  const resultado = await supabase
    .from("leads")
    .insert({
      empresa_id: vinculoEmpresa.empresa_id,
      nome: leadForm.nome.trim(),
      telefone: leadForm.telefone.trim(),
      produto: leadForm.produto,
      etapa: leadForm.etapa,
    });

  error = resultado.error;
}

    if (error) {
      console.error("Erro ao cadastrar lead:", error);
      setMensagem("Erro ao cadastrar lead.");
      return;
    }

    setMensagem("Lead cadastrado com sucesso!");

    setLeadForm({
      nome: "",
      telefone: "",
      produto: "Seguro Auto e Moto",
      etapa: "Em atendimento",
    });

    setNovoLeadAberto(false);
    setLeadEditando(null);

    await carregarLeads();
  } catch (error) {
    console.error("Erro inesperado ao cadastrar lead:", error);
    setMensagem("Ocorreu um erro ao cadastrar o lead.");
  }
}
function abrirEdicaoLead(lead: any) {
  setLeadEditando(lead);

  setLeadForm({
    nome: lead.nome || "",
    telefone: lead.telefone || "",
    produto: lead.produto || "Seguro Auto e Moto",
    etapa: lead.etapa || "Em atendimento",
  });

  setNovoLeadAberto(true);
  setMensagem("");
}
async function excluirLead(lead: any) {
  const confirmar = window.confirm(
    `Deseja realmente excluir o lead "${lead.nome}"?`
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead.id)
      .eq("empresa_id", lead.empresa_id);

    if (error) {
      console.error("Erro ao excluir lead:", error);
      setMensagem("Ocorreu um erro ao excluir o lead.");
      return;
    }

    await carregarLeads();
    setMensagem("Lead excluído com sucesso.");
  } catch (error) {
    console.error("Erro inesperado ao excluir lead:", error);
    setMensagem("Ocorreu um erro inesperado ao excluir o lead.");
  }
}
function abrirCadastroVenda(lead: any) {
  setLeadEmConversao(lead);
  setClienteEditando(null);

  setForm({
    nome: lead.nome || "",
    cpf: "",
    telefone: lead.telefone || "",
    data_nascimento: "",
    seguradora: "",
    premio_liquido: "",
    percentual_comissao: "",
    vigencia_inicio: "",
    vigencia_fim: "",
  });

  setMenu("Cadastrar Venda");
  setMensagem("");
}
  async function renovarApolice() {
  setMensagem("");

  if (!clienteEditando) {
    setMensagem("Nenhum cliente selecionado para renovação.");
    return;
  }

  if (!form.premio_liquido || !form.percentual_comissao) {
    setMensagem("Preencha o prêmio líquido e a comissão.");
    return;
  }

  if (!form.vigencia_inicio || !form.vigencia_fim) {
    setMensagem("Preencha as datas de início e fim da nova apólice.");
    return;
  }

  const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  setMensagem("Usuário não autenticado.");
  return;
}

const { data: vinculoEmpresa, error: erroEmpresa } = await supabase
  .from("usuarios_empresa")
  .select("empresa_id")
  .eq("id", user.id)
  .single();

if (erroEmpresa || !vinculoEmpresa) {
  console.error("Erro ao encontrar empresa:", erroEmpresa);
  setMensagem("Não foi possível identificar a empresa do usuário.");
  return;
}

const novaApolice = {
  cliente_id: clienteEditando.id,
  empresa_id: vinculoEmpresa.empresa_id,
  seguradora: form.seguradora,
  premio_liquido: Number(form.premio_liquido || 0),
  percentual_comissao: Number(form.percentual_comissao || 0),
  vigencia_inicio: form.vigencia_inicio,
  vigencia_fim: form.vigencia_fim,
};

const { error: erroApolice } = await supabase
  .from("apolices")
  .insert([novaApolice]);

  if (erroApolice) {
    console.error("ERRO RENOVAÇÃO:", {
  message: erroApolice?.message,
  details: erroApolice?.details,
  hint: erroApolice?.hint,
  code: erroApolice?.code,
});
    setMensagem(
      "Erro ao registrar a renovação: " + erroApolice.message
    );
    return;
  }

  const { error: erroCliente } = await supabase
    .from("clientes")
    .update({
      seguradora: form.seguradora,
      premio_liquido: Number(form.premio_liquido || 0),
      percentual_comissao: Number(form.percentual_comissao || 0),
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim,
    })
    .eq("id", clienteEditando.id);

  if (erroCliente) {
    console.error(erroCliente);
    setMensagem(
      "A nova apólice foi registrada, mas houve erro ao atualizar o cliente: " +
        erroCliente.message
    );
    return;
  }

  setMensagem("✅ Apólice renovada com sucesso!");

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

  setMenu("Clientes");
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

  if (assinaturaAtiva === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-slate-950">
            Assinatura necessária
          </h1>

          <p className="mt-3 text-slate-600">
            Sua assinatura ou período de teste não está ativo no momento.
          </p>

          <p className="mt-2 text-slate-600">
            Para continuar utilizando o CRM, ative seu plano.
          </p>

          <button
  onClick={() => router.push("/assinatura")}
  className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800"
>
  Ativar assinatura
</button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="mt-3 w-full rounded-lg px-4 py-3 text-slate-600 hover:bg-slate-100"
          >
            Sair
          </button>
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
              {empresaNome}
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
    <h2 className="text-xl font-semibold">
      Olá, {empresaNome} 👋
    </h2>

    <p className="mt-1 text-slate-500">
      Aqui está o resumo da sua corretora.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">

  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">
      Total de Leads
    </p>

    <p className="mt-2 text-3xl font-bold text-slate-900">
      {leads.length}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">
      Leads em atendimento
    </p>

    <p className="mt-2 text-3xl font-bold text-slate-900">
      {leads.filter((lead) => lead.etapa === "Em atendimento").length}
    </p>
  </div>

  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">
      Leads em proposta
    </p>

    <p className="mt-2 text-3xl font-bold text-slate-900">
      {leads.filter((lead) => lead.etapa === "Proposta").length}
    </p>
  </div>

</div>
    {dadosAssinatura && (
  <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-slate-500">
          Seu plano
        </p>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {dadosAssinatura.plano}
        </p>

        <p className="mt-1 text-slate-600">
          R$ {Number(dadosAssinatura.valor_mensal)
            .toFixed(2)
            .replace(".", ",")}
          /mês
        </p>
      </div>

      {String(dadosAssinatura.status).trim().toLowerCase() === "ativo" ? (
        <div className="rounded-xl bg-green-50 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-green-700">
            ✅ Assinatura ativa
          </p>

          <p className="mt-1 text-sm text-green-600">
            Seu plano está ativo
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-slate-700">
            🎁 Teste grátis
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {dadosAssinatura.dias_restantes}
          </p>

          <p className="text-xs text-slate-500">
            dias restantes
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Termina em{" "}
            {new Date(
              dadosAssinatura.trial_ate
            ).toLocaleDateString("pt-BR")}
          </p>

          <button
            onClick={() => router.push("/assinatura")}
            className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Assinar agora
          </button>
        </div>
      )}
    </div>
  </div>
)}

                

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
  {/* APÓLICES EMITIDAS */}
  <div className="rounded-2xl bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">
      Apólices emitidas
    </p>

    <p className="mt-2 text-3xl font-bold text-slate-900">
      {totalApolices}
    </p>
  </div>

  {/* RENOVAÇÕES */}
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
  </div>
</div>

{/* GRÁFICO DE SEGURADORAS */}
<div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
  <h4 className="mb-4 text-lg font-semibold">
    Seguradoras vendidas
  </h4>

  {dadosSeguradoras.length === 0 ? (
    <p className="text-sm text-slate-500">
      Cadastre uma apólice para visualizar o gráfico.
    </p>
  ) : (
    <div className="flex justify-center">
      <PieChart width={700} height={420}>
  <Pie
    data={dadosSeguradoras}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={125}
    label={renderLabelSeguradora}
    labelLine={false}
  >
    {dadosSeguradoras.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={`hsl(${index * 60}, 70%, 55%)`}
        stroke="#ffffff"
        strokeWidth={2}
      />
    ))}
  </Pie>

  <Tooltip />
</PieChart>
    </div>
  )}
</div>
<div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
  <h4 className="text-lg font-semibold">
    🎂 Aniversariantes
  </h4>

  <p className="mt-1 text-sm text-slate-500">
    Clientes que fazem aniversário nos próximos 7 dias.
  </p>

  {(() => {
    const aniversariantes = clientes
      .filter((cliente) => {
        if (!cliente.data_nascimento) return false;

        const aniversario = calcularAniversario(
          cliente.data_nascimento
        );

        return aniversario && aniversario.dias <= 7;
      })
      .sort((a, b) => {
        const aniversarioA = calcularAniversario(
          a.data_nascimento
        );

        const aniversarioB = calcularAniversario(
          b.data_nascimento
        );

        return (
          (aniversarioA?.dias ?? 999) -
          (aniversarioB?.dias ?? 999)
        );
      });

    if (aniversariantes.length === 0) {
      return (
        <p className="mt-4 text-sm text-slate-500">
          Nenhum aniversário nos próximos 7 dias. 🎉
        </p>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        {aniversariantes.map((cliente) => {
          const aniversario = calcularAniversario(
            cliente.data_nascimento
          );

          if (!aniversario) return null;

          return (
            <div
              key={cliente.id}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <div>
                <p className="font-medium">
                  {cliente.nome}
                </p>

                <p className="text-sm text-slate-500">
                  🎂{" "}
                  {String(aniversario.dia).padStart(2, "0")}/
                  {String(aniversario.mes).padStart(2, "0")}
                  {" • "}
                  {aniversario.dias === 0
                    ? "Aniversário hoje! 🎉"
                    : aniversario.dias === 1
                    ? "Amanhã"
                    : `em ${aniversario.dias} dias`}
                </p>
              </div>

              {cliente.telefone && (
                <a
                  href={`https://wa.me/55${cliente.telefone.replace(
                    /\D/g,
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                  title="Conversar pelo WhatsApp"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M12.04 2a9.93 9.93 0 0 0-8.55 15.03L2 22l5.13-1.34A9.93 9.93 0 1 0 12.04 2Zm0 17.93a8 8 0 0 1-4.08-1.12l-.29-.17-3.05.8.81-2.97-.19-.3a8 8 0 1 1 6.8 3.76Zm4.38-5.99c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.16.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                  </svg>
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  })()}
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
            <button
  onClick={() => {
    setClienteVisualizando(cliente);
    carregarDocumentos(cliente.id);
  }}
  className="text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline"
>
  {cliente.nome}
</button>

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
  setMenu("Cadastrar Venda");
}}
  className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
>
  ✏️ Editar
</button>
<button
  onClick={() => {
    setClienteEditando(cliente);
    setMenu("Renovar");
  }}
  className="mt-2 ml-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
>
  🔄 Renovar
</button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

              

                <button
                  onClick={() => setMenu("Cadastrar Venda")}
                  className="mt-6 rounded-lg bg-slate-950 px-5 py-3 font-medium text-white"
                >
                  + Novo Cliente
                </button>

              </div>
            )}
{clienteVisualizando && (
  <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-2xl font-bold text-slate-900">
          👤 Ficha do Cliente
        </h3>

        <p className="mt-1 text-slate-500">
          Consulta dos dados cadastrados.
        </p>
      </div>

      <button
        onClick={() => setClienteVisualizando(null)}
        className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-300"
      >
        ✕ Fechar
      </button>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Nome
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.nome || "Não informado"}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          CPF
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.cpf || "Não informado"}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Telefone
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.telefone || "Não informado"}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Data de nascimento
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.data_nascimento
            ? new Date(
                clienteVisualizando.data_nascimento + "T00:00:00"
              ).toLocaleDateString("pt-BR")
            : "Não informado"}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Seguradora
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.seguradora || "Não informada"}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Prêmio líquido
        </p>

        <p className="mt-1 font-semibold">
          R$ {Number(clienteVisualizando.premio_liquido || 0).toFixed(2)}
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Comissão
        </p>

        <p className="mt-1 font-semibold">
          {Number(clienteVisualizando.percentual_comissao || 0)}%
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Vigência
        </p>

        <p className="mt-1 font-semibold">
          {clienteVisualizando.vigencia_inicio
            ? new Date(
                clienteVisualizando.vigencia_inicio + "T00:00:00"
              ).toLocaleDateString("pt-BR")
            : "--"}
          {" até "}
          {clienteVisualizando.vigencia_fim
            ? new Date(
                clienteVisualizando.vigencia_fim + "T00:00:00"
              ).toLocaleDateString("pt-BR")
            : "--"}
        </p>
      </div>

        </div>

    {/* DOCUMENTOS DO CLIENTE */}
    <div className="mt-8 border-t pt-6">
      <h4 className="text-lg font-semibold">
        📎 Documentos
      </h4>

      <p className="mt-1 text-sm text-slate-500">
        Adicione documentos relacionados a este cliente.
      </p>

      <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
        📎 Adicionar documento

        <input
          type="file"
          className="hidden"
          disabled={enviandoDocumento}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];

            if (!arquivo || !clienteVisualizando) return;

            enviarDocumento(clienteVisualizando.id, arquivo);

            e.target.value = "";
          }}
        />
      </label>

      {enviandoDocumento && (
        <p className="mt-3 text-sm text-blue-600">
          ⏳ Enviando documento...
        </p>
      )}

      {documentosCliente.length === 0 && !enviandoDocumento && (
        <p className="mt-4 text-sm text-slate-500">
          Nenhum documento cadastrado para este cliente.
        </p>
      )}

      {documentosCliente.length > 0 && (
        <div className="mt-4 space-y-2">
          {documentosCliente.map((documento) => (
            <div
  key={documento.id}
  className="flex items-center justify-between rounded-lg border p-3"
>
  <div>
    <p className="font-medium">
      {documento.nome_arquivo}
    </p>

    <p className="text-xs text-slate-500">
      {documento.tipo_arquivo || "Arquivo"}
    </p>
  </div>

  <div className="flex gap-2">
    <button
      onClick={() => baixarDocumento(documento)}
      className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800"
    >
      ⬇️ Baixar
    </button>

    <button
      onClick={() => excluirDocumento(documento)}
      className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
    >
      🗑️ Excluir
    </button>
  </div>
</div>
          ))}
        </div>
      )}
    </div>

    <div className="mt-6 flex gap-3">
      <button
        onClick={() => {
          setClienteEditando(clienteVisualizando);
          setForm({
            nome: clienteVisualizando.nome || "",
            cpf: clienteVisualizando.cpf || "",
            telefone: clienteVisualizando.telefone || "",
            data_nascimento: clienteVisualizando.data_nascimento || "",
            seguradora: clienteVisualizando.seguradora || "",
            premio_liquido:
              clienteVisualizando.premio_liquido?.toString() || "",
            percentual_comissao:
              clienteVisualizando.percentual_comissao?.toString() || "",
            vigencia_inicio:
              clienteVisualizando.vigencia_inicio || "",
            vigencia_fim:
              clienteVisualizando.vigencia_fim || "",
          });

          setClienteVisualizando(null);
          setMenu("Cadastrar Venda");
        }}
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        ✏️ Editar cliente
      </button>

      <button
        onClick={() => {
          setClienteEditando(clienteVisualizando);
          setClienteVisualizando(null);
          setMenu("Renovar");
        }}
        className="rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700"
      >
        🔄 Renovar apólice
      </button>
    </div>
  </div>
)}
            {menu === "Cadastrar Venda" && (
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
            {menu === "Leads" && (
  <div className="space-y-6">

    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Leads 🎯
        </h2>

        <p className="mt-1 text-slate-500">
          Gerencie suas oportunidades e acompanhe suas vendas.
        </p>
      </div>

      <button
        onClick={() => setNovoLeadAberto(!novoLeadAberto)}
        className="rounded-lg bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800"
      >
        + Cadastrar novo lead
      </button>
    </div>

    {novoLeadAberto && (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">
          Cadastrar novo lead
        </h3>

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nome
            </label>

            <input
              type="text"
              value={leadForm.nome}
              onChange={(e) =>
                setLeadForm({
                  ...leadForm,
                  nome: e.target.value,
                })
              }
              placeholder="Nome completo"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Telefone
            </label>

            <input
              type="text"
              value={leadForm.telefone}
              onChange={(e) =>
                setLeadForm({
                  ...leadForm,
                  telefone: e.target.value,
                })
              }
              placeholder="Telefone / WhatsApp"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Produto
            </label>

            <select
              value={leadForm.produto}
              onChange={(e) =>
                setLeadForm({
                  ...leadForm,
                  produto: e.target.value,
                })
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="Seguro Auto e Moto">
                Seguro Auto e Moto
              </option>

              <option value="Seguro Empresarial">
                Seguro Empresarial
              </option>

              <option value="Seguro de Vida">
                Seguro de Vida
              </option>

              <option value="Seguro Celular">
                Seguro Celular
              </option>

              <option value="Outros">
                Outros
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Etapa
            </label>

            <select
              value={leadForm.etapa}
              onChange={(e) =>
                setLeadForm({
                  ...leadForm,
                  etapa: e.target.value,
                })
              }
              className="w-full rounded-lg border p-3"
            >
              <option value="Em atendimento">
                Em atendimento
              </option>

              <option value="Proposta">
                Proposta
              </option>
            </select>
          </div>

        </div>

        {mensagem && (
          <div className="mt-5 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
            {mensagem}
          </div>
        )}

        <div className="mt-6 flex gap-3">

          <button
            onClick={salvarLead}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            {leadEditando ? "Salvar alterações" : "Cadastrar Lead"}
          </button>

          <button
            onClick={() => {
  setNovoLeadAberto(false);
  setLeadEditando(null);
}}
            className="rounded-lg bg-slate-200 px-6 py-3 font-medium text-slate-700 hover:bg-slate-300"
          >
            Cancelar
          </button>

        </div>
      </div>
    )}

    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">
          Seus Leads
        </h3>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {carregandoLeads ? (
        <p className="mt-6 text-slate-500">
          Carregando leads...
        </p>
      ) : leads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium text-slate-700">
            Nenhum lead cadastrado.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Clique em “Cadastrar novo lead” para começar.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">

          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {lead.nome}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    📞 {lead.telefone}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    🛡️ {lead.produto}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:items-end">

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      lead.etapa === "Convertido"
                        ? "bg-green-100 text-green-700"
                        : lead.etapa === "Proposta"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {lead.etapa}
                  </span>

                  {lead.etapa !== "Convertido" && (
                    <button
                      onClick={() => abrirCadastroVenda(lead)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Cadastrar venda
                    </button>
                  )}
                  <button
  onClick={() => abrirEdicaoLead(lead)}
  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
>
  Editar
</button>

<button
  onClick={() => excluirLead(lead)}
  className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
>
  Excluir
</button>

                </div>

              </div>
            </div>
          ))}

        </div>
      )}

    </div>

  </div>
)}

{menu === "Renovar" && clienteEditando && (
  <div className="rounded-2xl bg-white p-6 shadow">
    <h2 className="mb-2 text-2xl font-bold">
      🔄 Renovar Apólice
    </h2>

    <p className="mb-6 text-gray-600">
      Cliente: <strong>{clienteEditando.nome}</strong>
    </p>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

      <div>
        <label className="mb-1 block text-sm font-medium">
          Seguradora
        </label>
        <input
          type="text"
          value={form.seguradora}
          onChange={(e) =>
            setForm({ ...form, seguradora: e.target.value })
          }
          className="w-full rounded-lg border p-3"
          placeholder="Digite a seguradora"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Prêmio líquido
        </label>
        <input
          type="number"
          value={form.premio_liquido}
          onChange={(e) =>
            setForm({ ...form, premio_liquido: e.target.value })
          }
          className="w-full rounded-lg border p-3"
          placeholder="0,00"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Comissão (%)
        </label>
        <input
          type="number"
          value={form.percentual_comissao}
          onChange={(e) =>
            setForm({ ...form, percentual_comissao: e.target.value })
          }
          className="w-full rounded-lg border p-3"
          placeholder="Ex.: 20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Início da nova vigência
        </label>
        <input
          type="date"
          value={form.vigencia_inicio}
          onChange={(e) =>
            setForm({ ...form, vigencia_inicio: e.target.value })
          }
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Fim da nova vigência
        </label>
        <input
          type="date"
          value={form.vigencia_fim}
          onChange={(e) =>
            setForm({ ...form, vigencia_fim: e.target.value })
          }
          className="w-full rounded-lg border p-3"
        />
      </div>

    </div>

    <div className="mt-6 flex gap-3">
      <button
        onClick={renovarApolice}
        className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
      >
        ✅ Confirmar renovação
      </button>

      <button
        onClick={() => {
          setClienteEditando(null);
          setMenu("Clientes");
        }}
        className="rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-700 hover:bg-gray-300"
      >
        Cancelar
      </button>
    </div>
  </div>
)}
            {[
  "Renovações",
  "Comissões",
  "Relatórios",
  "Suporte à Corretora",
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
          <button
  onClick={() => {
    setClienteVisualizando(cliente);
    carregarDocumentos(cliente.id);
  }}
  className="text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline"
>
  {cliente.nome}
</button>

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
) : menu === "Suporte à Corretora" ? (
  <div className="max-w-4xl">
    <h3 className="text-2xl font-bold text-slate-900">
      Contato 📞
    </h3>

    <p className="mt-1 text-slate-500">
      Entre em contato com o suporte.
    </p>

    <div className="mt-6 grid gap-5 md:grid-cols-2">

    

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
