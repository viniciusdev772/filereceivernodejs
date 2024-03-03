const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/config"); // Ajuste o caminho conforme necessário
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class Arquivo extends Model {}

Arquivo.init(
  {
    // Define os atributos do modelo
    uid: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    short: {
      type: DataTypes.STRING,
      defaultValue: function () {
        return crypto.randomBytes(5).toString("hex");
      },
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    caminho: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    uid_dono: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Arquivo",
    tableName: "arquivos",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = Arquivo;
