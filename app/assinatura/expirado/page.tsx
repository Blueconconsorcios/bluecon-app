export default function AssinaturaExpirada() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg border border-gray-200 p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
          <span className="text-4xl">!</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">
          Pagamento expirado
        </h1>

        <p className="mt-4 text-gray-600">
          O prazo para concluir o pagamento terminou.
        </p>

        <p className="mt-2 text-gray-600">
          Você pode iniciar uma nova tentativa de pagamento.
        </p>

        <a
          href="/"
          className="mt-8 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Voltar para o Bluecon CRM
        </a>
      </div>
    </main>
  );
}