const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/config"); // Ajuste o caminho conforme necessário
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class Usuario extends Model {}

Usuario.init(
  {
    // Define os atributos do modelo
    uid: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    storage: {
      type: DataTypes.STRING,
      defaultValue: "1073741824",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        // Hash da senha usando MD5 antes de salvar no banco de dados
        const hash = crypto.createHash("md5").update(value).digest("hex");
        this.setDataValue("senha", hash);
      },
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    space: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
    },
    // Campos adicionais para verificação de email
    emailVerificado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    tokenVerificacaoEmail: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
    },
  },
  {
    sequelize,
    modelName: "Usuario",
    tableName: "usuarios",
    timestamps: true, // Adiciona os campos createdAt e updatedAt
  }
);

module.exports = Usuario;
