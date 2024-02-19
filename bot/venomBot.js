import venom from "venom-bot";

class VenomBot {
  constructor(sessionName) {
    this.sessionName = sessionName;
  }

  start() {
    venom
      .create({
        session: this.sessionName, // Nome da sessão
      })
      .then((client) => this.initialize(client))
      .catch((error) => {
        console.log(error);
      });
  }

  initialize(client) {
    client.onMessage((message) => {
      if (message.body === "conectar" && !message.isGroupMsg) {
        client
          .sendText(message.from, "olá Tudo bem?")
          .then((result) => {
            console.log("Result: ", result); // Objeto de sucesso
            // Primeira mensagem adicional
            return client.sendText(
              message.from,
              "para vincular sua conta do Site https://servidor.viniciusdev.com.br será necessário que você faça login com link da próxima mensagem"
            );
          })
          .then((result) => {
            console.log("Result: ", result); // Objeto de sucesso da primeira mensagem adicional
            // Segunda mensagem adicional
            return client.sendText(
              message.from,
              "Fique à vontade para fazer perguntas."
            );
          })
          .catch((error) => {
            console.error("Erro ao enviar: ", error); // Objeto de erro
          });
      }
    });
  }
}

export default VenomBot;
