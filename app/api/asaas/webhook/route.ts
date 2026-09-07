import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const payload = await request.json();

    const eventoId = payload?.id;
    const tipoEvento = payload?.event;
    const checkoutId = payload?.checkout?.id;

    if (!eventoId || !tipoEvento) {
      return NextResponse.json(
        {
          erro: "Evento inválido.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc(
      "processar_webhook_checkout",
      {
        p_evento_id: eventoId,
        p_tipo_evento: tipoEvento,
        p_checkout_id: checkoutId || null,
        p_payload: payload,
      }
    );

    if (error) {
      console.error(
        "Erro ao processar webhook Asaas:",
        error
      );

      return NextResponse.json(
        {
          erro: "Erro ao processar evento.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
    });
  } catch (erro) {
    console.error(
      "Erro ao receber webhook Asaas:",
      erro
    );

    return NextResponse.json(
      {
        erro: "Payload inválido.",
      },
      { status: 400 }
    );
  }
}