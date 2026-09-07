"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    router.push("/");
  }
async function cadastrar(e: React.FormEvent) {
    e.preventDefault();

    setErro("");

    if (!nomeEmpresa.trim()) {
      setErro("Informe o nome da empresa ou corretora.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
  email,
  password: senha,
  options: {
    data: {
      nome_empresa: nomeEmpresa,
    },
  },
});

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    if (!data.user) {
      setErro("Não foi possível criar o usuário.");
      setCarregando(false);
      return;
    }

    if (!data.session) {
  setErro(
    "Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login."
  );
  setCarregando(false);
  return;
}

router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-950">
            BLUECON
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gestão de Seguros
          </p>
        </div>

        <form
  onSubmit={modoCadastro ? cadastrar : entrar}
  className="space-y-5"
>
{modoCadastro && (
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-700">
      Nome da empresa ou corretora
    </label>

    <input
      type="text"
      value={nomeEmpresa}
      onChange={(e) => setNomeEmpresa(e.target.value)}
      placeholder="Ex.: Saroka Corretora de Seguros"
      required
      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
    />
  </div>
)}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Senha
            </label>

            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-slate-950 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {carregando
  ? modoCadastro
    ? "Criando conta..."
    : "Entrando..."
  : modoCadastro
  ? "Criar minha conta"
  : "Entrar"}
          </button>

        </form>
        <button
  type="button"
  onClick={() => {
    setModoCadastro(!modoCadastro);
    setErro("");
  }}
  className="mt-4 w-full text-sm font-medium text-blue-600 hover:text-blue-800"
>
  {modoCadastro
    ? "Já tenho uma conta — Entrar"
    : "Ainda não tenho conta — Criar minha conta"}
</button>
      </div> 
    </main>
  );
}
