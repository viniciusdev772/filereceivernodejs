"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("usuarios", "expira_em", {
      type: Sequelize.STRING,
      allowNull: true, // Permita null se a coluna não for obrigatória
      // defaultValue: 'Seu valor padrão', // Opcional: um valor padrão para a coluna
      defaultValue: "0",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("usuarios", "expira_em");
  },
};
