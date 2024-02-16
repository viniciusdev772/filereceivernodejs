const Sequelize = require("sequelize");

// Cria uma nova instância do Sequelize para a conexão com o banco de dados
const sequelize = new Sequelize("cdn_vdev", "cdn_vdev", "cdn_vdev", {
  host: "localhost", // Host do servidor MySQL
  dialect: "mysql", // Informa ao Sequelize que estamos utilizando o MySQL
});

// Testa a conexão com o banco de dados
sequelize
  .authenticate()
  .then(() => {
    console.log("Conexão estabelecida com sucesso.");
  })
  .catch((err) => {
    console.error("Não foi possível conectar ao banco de dados:", err);
  });

module.exports = sequelize;
