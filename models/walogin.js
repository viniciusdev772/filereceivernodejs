const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/config"); // Ajuste o caminho conforme necessário
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class WALogin extends Model {}

WALogin.init(
  {
    uid: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "WA",
    tableName: "wa",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = WALogin;
