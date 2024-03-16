const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/config"); // Ajuste o caminho conforme necessário
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class WebToken extends Model {}

WebToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "WebToken",
    tableName: "WebToken",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = WebToken;
