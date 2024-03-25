"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("usuarios", "storage", {
      type: Sequelize.STRING, // ou o novo tipo de dados que deseja definir, como Sequelize.STRING ou Sequelize.INTEGER
      allowNull: false,
      defaultValue: "5368709120", // ou o novo valor padrão desejado
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("usuarios", "storage", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "5368709120",
    });
  },
};
