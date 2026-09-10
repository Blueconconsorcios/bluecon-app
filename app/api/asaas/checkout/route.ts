import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST() {
  const chave = process.env.ASAAS_API_KEY?.replace(/\\\$/g, "$");

  if (!chave) {
    return NextResponse.json(
      { erro: "ASAAS_API_KEY não encontrada." },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  try {
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

    // =========================================================
    // 1. BUSCA OS DADOS DA EMPRESA
    // =========================================================

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select(
        "id, nome, cpf_cnpj, telefone, cep, endereco, numero, complemento, bairro, cidade, estado"
      )
      .eq("id", empresaId)
      .single();

    if (erroEmpresa || !empresa) {
      return NextResponse.json(
        {
          erro: "Dados da empresa não encontrados.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 2. BUSCA A ASSINATURA INTERNA DA EMPRESA
    // =========================================================

    const { data: assinaturaData, error: erroAssinatura } =
      await supabase.rpc("minha_assinatura_asaas");

    const assinatura = assinaturaData?.[0];

    if (erroAssinatura || !assinatura) {
      return NextResponse.json(
        {
          erro: "Assinatura interna da empresa não encontrada.",
          detalhes: erroAssinatura?.message,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. SE JÁ EXISTE ASSINATURA NO ASAAS, NÃO CRIA OUTRA
    // =========================================================

    if (
      assinatura.gateway_subscription_id &&
      (
        assinatura.gateway_status === "ACTIVE" ||
        assinatura.gateway_status === "RECEIVED"
      )
    ) {
      return NextResponse.json({
        sucesso: true,
        jaExiste: true,
        mensagem: "A empresa já possui uma assinatura ativa.",
        assinatura: {
          id: assinatura.gateway_subscription_id,
          status: assinatura.gateway_status,
        },
      });
    }

    // =========================================================
    // 4. REUTILIZA CHECKOUT AINDA DISPONÍVEL
    // =========================================================

    if (
  assinatura.gateway_checkout_id &&
  assinatura.gateway_checkout_status === "ACTIVE" &&
  assinatura.gateway_checkout_url &&
  !assinatura.gateway_checkout_url.includes("sandbox.asaas.com")
) {
      return NextResponse.json({
        sucesso: true,
        jaExiste: true,
        checkout: {
          id: assinatura.gateway_checkout_id,
          url: assinatura.gateway_checkout_url,
          status: assinatura.gateway_checkout_status,
        },
      });
    }

    // =========================================================
    // 5. VERIFICA DADOS OBRIGATÓRIOS
    // =========================================================

    const camposObrigatorios = [
      ["CPF/CNPJ", empresa.cpf_cnpj],
      ["telefone", empresa.telefone],
      ["CEP", empresa.cep],
      ["endereço", empresa.endereco],
      ["número", empresa.numero],
      ["bairro", empresa.bairro],
      ["cidade", empresa.cidade],
    ];

    const campoVazio = camposObrigatorios.find(
      ([, valor]) => !valor || !String(valor).trim()
    );

    if (campoVazio) {
      return NextResponse.json(
        {
          erro: `O cadastro da empresa está incompleto. Informe: ${campoVazio[0]}.`,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 6. CRIA CLIENTE NO ASAAS, SE NECESSÁRIO
    // =========================================================

    let gatewayCustomerId = assinatura.gateway_customer_id;

    if (!gatewayCustomerId) {
      const cpfCnpj = String(empresa.cpf_cnpj).replace(/\D/g, "");
      const telefone = String(empresa.telefone).replace(/\D/g, "");
      const cep = String(empresa.cep).replace(/\D/g, "");

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
            cpfCnpj,
            email: user.email,
            phone: telefone,
            postalCode: cep,
            address: empresa.endereco,
            addressNumber: empresa.numero,
            complement: empresa.complemento || undefined,
            province: empresa.bairro,
            city: empresa.cidade,
            externalReference: empresaId,
          }),
        }
      );

      const dadosCliente = await respostaCliente.json();

      if (!respostaCliente.ok) {
        console.error(
          "Erro ao criar cliente Asaas:",
          dadosCliente
        );

        return NextResponse.json(
          {
            erro: "Não foi possível criar o cliente no Asaas.",
            detalhes: dadosCliente,
          },
          { status: respostaCliente.status }
        );
      }

      if (!dadosCliente.id) {
        return NextResponse.json(
          {
            erro: "O Asaas não retornou o ID do cliente.",
          },
          { status: 500 }
        );
      }

      gatewayCustomerId = dadosCliente.id;

      // =========================================================
      // 7. VINCULA CLIENTE ASAAS À EMPRESA
      // =========================================================

      const { error: erroVinculo } = await supabase.rpc(
        "vincular_cliente_asaas",
        {
          p_gateway_customer_id: gatewayCustomerId,
        }
      );

      if (erroVinculo) {
        console.error(
          "Erro ao vincular cliente Asaas:",
          erroVinculo
        );

        return NextResponse.json(
          {
            erro:
              "Cliente criado no Asaas, mas não foi possível vinculá-lo à empresa.",
            detalhes: erroVinculo.message,
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
    // 8. CRIA CHECKOUT RECORRENTE
    // =========================================================

    const resposta = await fetch(
      "https://api.asaas.com/v3/checkouts",
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

          billingTypes: ["CREDIT_CARD"],

          chargeTypes: ["RECURRENT"],

          minutesToExpire: 60,

          externalReference: empresaId,

          callback: {
            successUrl:
              "https://bluecon-app.vercel.app/assinatura/sucesso",
            cancelUrl:
              "https://bluecon-app.vercel.app/assinatura/cancelado",
            expiredUrl:
              "https://bluecon-app.vercel.app/assinatura/expirado",
          },

          items: [
            {
              name: "Plano Completo",
              description:
                "Assinatura mensal do Bluecon CRM",
              quantity: 1,
              value: 29.9,
            },
          ],

          subscription: {
            cycle: "MONTHLY",

            nextDueDate: new Date()
  .toISOString()
  .slice(0, 10),
          },
        }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error(
        "Erro ao criar Checkout Asaas:",
        dados
      );

      return NextResponse.json(
        {
          erro:
            "Não foi possível criar o Checkout no Asaas.",
          detalhes: dados,
        },
        { status: resposta.status }
      );
    }

    if (!dados.id) {
      return NextResponse.json(
        {
          erro:
            "O Asaas não retornou o ID do Checkout.",
        },
        { status: 500 }
      );
    }

    const checkoutUrl =
      `https://asaas.com/checkoutSession/show?id=${dados.id}`;

    // =========================================================
    // 9. SALVA O CHECKOUT NA ASSINATURA
    // =========================================================

    const { error: erroSalvar } = await supabase.rpc(
      "vincular_checkout_asaas",
      {
        p_gateway_checkout_id: dados.id,
        p_gateway_checkout_url: checkoutUrl,
        p_gateway_checkout_status: "ACTIVE",
      }
    );

    if (erroSalvar) {
      console.error(
        "Erro ao vincular Checkout:",
        erroSalvar
      );

      return NextResponse.json(
        {
          erro:
            "Checkout criado no Asaas, mas não foi possível vinculá-lo à empresa.",
          detalhes: erroSalvar.message,
          checkout_id: dados.id,
          checkout_url: checkoutUrl,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 10. RETORNA O CHECKOUT
    // =========================================================

    return NextResponse.json({
      sucesso: true,
      jaExiste: false,
      mensagem: "Checkout criado com sucesso.",
      checkout: {
        id: dados.id,
        url: checkoutUrl,
        status: "ACTIVE",
      },
    });
  } catch (erro) {
    console.error(
      "Erro ao criar Checkout Asaas:",
      erro
    );

    return NextResponse.json(
      {
        erro:
          "Erro ao conectar com o Checkout do Asaas.",
      },
      { status: 500 }
    );
  }
}