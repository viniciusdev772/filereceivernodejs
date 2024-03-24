const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // Corrigindo o caminho para o arquivo de configuração do Sequelize
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class IPS extends Model {}

IPS.init(
  {
    uid: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bloqueado: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false, // Definindo o valor padrão para bloqueado como false
    },
  },
  {
    sequelize,
    modelName: "IPS",
    tableName: "IPS",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = IPS;
