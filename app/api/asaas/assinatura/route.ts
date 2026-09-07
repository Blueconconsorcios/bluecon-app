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
    const { data: empresa, error: erroEmpresa } = await supabase
      .from("usuarios_empresa")
      .select("empresa_id")
      .eq("id", user.id)
      .single();

    if (erroEmpresa || !empresa?.empresa_id) {
      return NextResponse.json(
        { erro: "Empresa do usuário não encontrada." },
        { status: 400 }
      );
    }

    // 3. Cria uma trava atômica antes de chamar o Asaas
    const { data: trava, error: erroTrava } = await supabase.rpc(
      "iniciar_criacao_assinatura_asaas"
    );

    if (erroTrava) {
      console.error("Erro ao iniciar criação da assinatura:", erroTrava);

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

    // Se já existe assinatura Asaas
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

    // 4. Recebe os dados enviados pelo CRM
    const corpo = await request.json();

    if (!corpo.customer) {
      return NextResponse.json(
        { erro: "ID do cliente Asaas não informado." },
        { status: 400 }
      );
    }

    if (!corpo.nextDueDate) {
      return NextResponse.json(
        { erro: "Data do primeiro vencimento não informada." },
        { status: 400 }
      );
    }

    // 5. Cria a assinatura no Asaas
    const resposta = await fetch(
      "https://api-sandbox.asaas.com/v3/subscriptions",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "User-Agent": "Bluecon CRM/1.0",
          access_token: chave,
        },
        body: JSON.stringify({
          customer: corpo.customer,
          billingType: "UNDEFINED",
          value: 29.9,
          nextDueDate: corpo.nextDueDate,
          cycle: "MONTHLY",
          description: "Plano Completo - Bluecon CRM",
        }),
      }
    );

    const dados = await resposta.json();

    // 6. Se o Asaas rejeitar, libera a trava
    if (!resposta.ok) {
      await supabase
        .from("assinaturas")
        .update({
          assinatura_em_criacao: false,
        })
        .eq("empresa_id", empresa.empresa_id);

      return NextResponse.json(dados, {
        status: resposta.status,
      });
    }

    // 7. Vincula a assinatura criada à empresa
    const { error: erroVinculo } = await supabase.rpc(
      "vincular_assinatura_asaas",
      {
        p_gateway_customer_id: dados.customer,
        p_gateway_subscription_id: dados.id,
        p_gateway_status: dados.status,
      }
    );

    if (erroVinculo) {
      console.error("Erro ao vincular assinatura:", erroVinculo);

      // Libera a trava para permitir uma nova tentativa
      // caso o vínculo tenha falhado.
      await supabase
        .from("assinaturas")
        .update({
          assinatura_em_criacao: false,
        })
        .eq("empresa_id", empresa.empresa_id);

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

    // 8. Sucesso
    return NextResponse.json({
      sucesso: true,
      jaExiste: false,
      mensagem: "Assinatura criada e vinculada à empresa com sucesso.",
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
      console.error("Erro ao liberar trava:", erroTrava);
    }

    return NextResponse.json(
      {
        erro: "Erro ao conectar com o Asaas.",
      },
      { status: 500 }
    );
  }
}