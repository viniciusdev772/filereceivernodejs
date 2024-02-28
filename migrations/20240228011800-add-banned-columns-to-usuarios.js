"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adiciona a coluna 'banned'
    await queryInterface.addColumn("usuarios", "banned", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    // Adiciona a coluna 'banned_motivo'
    await queryInterface.addColumn("usuarios", "banned_motivo", {
      type: Sequelize.TEXT,
      allowNull: true, // Permite valores nulos, assumindo que pode não haver um motivo para o banimento
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove as colunas na ordem inversa para evitar dependências
    await queryInterface.removeColumn("usuarios", "banned_motivo");
    await queryInterface.removeColumn("usuarios", "banned");
  },
};
