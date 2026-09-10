import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const chave = process.env.ASAAS_API_KEY;

  if (!chave) {
    return NextResponse.json(
      { erro: "ASAAS_API_KEY não encontrada." },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  try {
    // 1. Identifica o usuário logado
    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user) {
      return NextResponse.json(
        { erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    // 2. Descobre a empresa do usuário
    const { data: empresaUsuario, error: erroEmpresaUsuario } =
      await supabase
        .from("usuarios_empresa")
        .select("empresa_id")
        .eq("id", user.id)
        .single();

    if (erroEmpresaUsuario || !empresaUsuario?.empresa_id) {
      return NextResponse.json(
        { erro: "Empresa do usuário não encontrada." },
        { status: 400 }
      );
    }

    const empresaId = empresaUsuario.empresa_id;

    // 3. Busca os dados da empresa e da assinatura
    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id, nome, cpf_cnpj")
      .eq("id", empresaId)
      .single();

    if (erroEmpresa || !empresa) {
      return NextResponse.json(
        { erro: "Dados da empresa não encontrados." },
        { status: 400 }
      );
    }

    if (!empresa.cpf_cnpj) {
      return NextResponse.json(
        {
          erro:
            "A empresa não possui CPF ou CNPJ cadastrado. Atualize o cadastro antes de continuar.",
        },
        { status: 400 }
      );
    }

    // 4. Verifica se já existe uma assinatura Asaas
    const { data: assinaturaData, error: erroAssinatura } =
  await supabase.rpc("minha_assinatura_asaas");

const assinaturaAtual = assinaturaData?.[0];

if (erroAssinatura || !assinaturaAtual) {
  console.error("Erro ao buscar assinatura:", erroAssinatura);

  return NextResponse.json(
    {
      erro: "Assinatura interna da empresa não encontrada.",
      detalhes: erroAssinatura?.message,
    },
    { status: 400 }
  );
}

    // 5. Se já existe assinatura Asaas, não cria outra
    if (assinaturaAtual.gateway_subscription_id) {
      return NextResponse.json({
        sucesso: true,
        jaExiste: true,
        mensagem: "Sua empresa já possui uma assinatura Asaas.",
        assinatura: {
          gateway_customer_id:
            assinaturaAtual.gateway_customer_id,
          gateway_subscription_id:
            assinaturaAtual.gateway_subscription_id,
          gateway_status:
            assinaturaAtual.gateway_status,
        },
      });
    }

    // 6. Cria uma trava atômica antes de chamar o Asaas
    const { data: trava, error: erroTrava } = await supabase.rpc(
      "iniciar_criacao_assinatura_asaas"
    );

    if (erroTrava) {
      console.error(
        "Erro ao iniciar criação da assinatura:",
        erroTrava
      );

      return NextResponse.json(
        {
          erro: "Não foi possível iniciar a criação da assinatura.",
          detalhes: erroTrava.message,
        },
        { status: 500 }
      );
    }

    const resultadoTrava = trava?.[0];

    if (!resultadoTrava) {
      return NextResponse.json(
        { erro: "Não foi possível verificar a assinatura." },
        { status: 500 }
      );
    }

    // 7. Se outra tentativa já estiver criando a assinatura
    if (!resultadoTrava.permitido) {
      if (resultadoTrava.assinatura_gateway_id) {
        return NextResponse.json({
          sucesso: true,
          jaExiste: true,
          mensagem: "Sua empresa já possui uma assinatura Asaas.",
          assinatura: {
            gateway_subscription_id:
              resultadoTrava.assinatura_gateway_id,
          },
        });
      }

      return NextResponse.json(
        {
          sucesso: false,
          emProcessamento: true,
          mensagem:
            "Uma assinatura já está sendo criada. Aguarde alguns instantes.",
        },
        { status: 409 }
      );
    }

    // 8. Cria ou reutiliza o cliente no Asaas
    let gatewayCustomerId =
      assinaturaAtual.gateway_customer_id;

    if (!gatewayCustomerId) {
      const respostaCliente = await fetch(
        "https://api.asaas.com/v3/customers",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "User-Agent": "Bluecon CRM/1.0",
            access_token: chave,
          },
          body: JSON.stringify({
            name: empresa.nome,
            cpfCnpj: empresa.cpf_cnpj,
            email: user.email,
            externalReference: empresa.id,
            notificationDisabled: false,
          }),
        }
      );

      const dadosCliente = await respostaCliente.json();

      console.log("RESPOSTA DO ASAAS AO CRIAR CLIENTE:", {
  status: respostaCliente.status,
  dados: dadosCliente,
});

      if (!respostaCliente.ok) {
        await supabase
          .from("assinaturas")
          .update({
            assinatura_em_criacao: false,
          })
          .eq("empresa_id", empresaId);

        return NextResponse.json(
          {
            erro: "Não foi possível criar o cliente no Asaas.",
            detalhes: dadosCliente,
          },
          { status: respostaCliente.status }
        );
      }

      if (!dadosCliente.id) {
        await supabase
          .from("assinaturas")
          .update({
            assinatura_em_criacao: false,
          })
          .eq("empresa_id", empresaId);

        return NextResponse.json(
          {
            erro:
              "O Asaas não retornou o ID do cliente criado.",
          },
          { status: 500 }
        );
      }

      gatewayCustomerId = dadosCliente.id;

      // Salva o cliente Asaas imediatamente
      const { error: erroSalvarCliente } = await supabase
        .from("assinaturas")
        .update({
          gateway: "asaas",
          gateway_customer_id: gatewayCustomerId,
        })
        .eq("empresa_id", empresaId);

      if (erroSalvarCliente) {
        console.error(
          "Erro ao salvar cliente Asaas:",
          erroSalvarCliente
        );

        await supabase
          .from("assinaturas")
          .update({
            assinatura_em_criacao: false,
          })
          .eq("empresa_id", empresaId);

        return NextResponse.json(
          {
            erro:
              "Cliente criado no Asaas, mas não foi possível salvar o vínculo no sistema.",
            detalhes: erroSalvarCliente.message,
            asaas_customer_id: gatewayCustomerId,
          },
          { status: 500 }
        );
      }
    }

    // 9. Define a data do primeiro vencimento
    const corpo = await request.json().catch(() => ({}));

    const nextDueDate =
      corpo.nextDueDate ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

    // 10. Cria a assinatura mensal no Asaas
    const resposta = await fetch(
      "https://api.asaas.com/v3/subscriptions",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "User-Agent": "Bluecon CRM/1.0",
          access_token: chave,
        },
        body: JSON.stringify({
          customer: gatewayCustomerId,
          billingType: "UNDEFINED",
          value: 29.9,
          nextDueDate,
          cycle: "MONTHLY",
          description: "Plano Completo - Bluecon CRM",
          externalReference: empresa.id,
        }),
      }
    );

    const dados = await resposta.json();

    // 11. Se o Asaas rejeitar, libera a trava
    if (!resposta.ok) {
      await supabase
        .from("assinaturas")
        .update({
          assinatura_em_criacao: false,
        })
        .eq("empresa_id", empresaId);

      return NextResponse.json(dados, {
        status: resposta.status,
      });
    }

    // 12. Vincula a assinatura criada à empresa
    const { error: erroVinculo } = await supabase.rpc(
      "vincular_assinatura_asaas",
      {
        p_gateway_customer_id: dados.customer,
        p_gateway_subscription_id: dados.id,
        p_gateway_status: dados.status,
      }
    );

    if (erroVinculo) {
      console.error(
        "Erro ao vincular assinatura:",
        erroVinculo
      );

      await supabase
        .from("assinaturas")
        .update({
          assinatura_em_criacao: false,
        })
        .eq("empresa_id", empresaId);

      return NextResponse.json(
        {
          erro:
            "A assinatura foi criada no Asaas, mas não foi vinculada à empresa.",
          detalhes: erroVinculo.message,
          asaas: dados,
        },
        { status: 500 }
      );
    }

    // 13. Sucesso
    return NextResponse.json({
      sucesso: true,
      jaExiste: false,
      mensagem:
        "Cliente e assinatura criados e vinculados à empresa com sucesso.",
      cliente: {
        id: gatewayCustomerId,
      },
      assinatura: dados,
    });
  } catch (erro) {
    console.error("Erro ao criar assinatura:", erro);

    // Em caso de erro inesperado, libera a trava.
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: empresa } = await supabase
          .from("usuarios_empresa")
          .select("empresa_id")
          .eq("id", user.id)
          .single();

        if (empresa?.empresa_id) {
          await supabase
            .from("assinaturas")
            .update({
              assinatura_em_criacao: false,
            })
            .eq("empresa_id", empresa.empresa_id);
        }
      }
    } catch (erroTrava) {
      console.error(
        "Erro ao liberar trava:",
        erroTrava
      );
    }

    return NextResponse.json(
      {
        erro: "Erro ao conectar com o Asaas.",
      },
      { status: 500 }
    );
  }
}