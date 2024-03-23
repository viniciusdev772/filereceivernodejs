const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/config"); // Ajuste o caminho conforme necessário
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class qrcode extends Model {}

qrcode.init(
  {
    uid: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unico: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    perm: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "qrcode",
    tableName: "qrcode",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = qrcode;
