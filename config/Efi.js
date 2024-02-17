const EfiPay = require("sdk-node-apis-efi");
const options = require("./credentials");

const efipay = new EfiPay(options);

async function criarPagamentoPix(valor, numeroPedido) {
  let body = {
    calendario: {
      expiracao: 3600,
    },
    valor: {
      original: valor, // Usamos o parâmetro de valor aqui
    },
    chave: "da969cfb-ab7b-4338-947b-caf519aac962",
    infoAdicionais: [
      {
        nome: "Pagamento em",
        valor: "VDEV SERVICOS DE TECNOLOGIA LTDA",
      },
      {
        nome: "Pedido",
        valor: numeroPedido, // Usamos o parâmetro de número do pedido aqui
      },
    ],
  };

  try {
    const resposta = await efipay.pixCreateImmediateCharge([], body);
    console.log(resposta);
    return resposta; // Retorna a resposta em caso de sucesso
  } catch (error) {
    console.error(error);
    throw error; // Lança o erro para ser tratado por quem chama a função
  }
}

// Exemplo de como usar a função
// Substitua '123.45' pelo valor desejado e 'NUMERO_DO_PEDIDO' pelo número do pedido do cliente
