const Usuario = require("../models/usuarios");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const arquivosModel = require("../models/arquivos");
const fs = require("fs-extra");

async function apagar(req, res) {
  //obter o token
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ erro: "Token não informado" });
  }
  jwt.verify(token, "seu_secret_jwt", async (err, decoded) => {
    if (err) {
      return res.status(401).json({ erro: "Token inválido" });
    }
    const uid = decoded.uid;
    const { fileId } = req.params;
    const arquivo = await arquivosModel.findOne({
      where: {
        uid: fileId,
        uid_dono: uid,
      },
    });
    if (!arquivo) {
      return res.status(404).json({ erro: "Arquivo não encontrado" });
    }
    await arquivosModel.destroy({
      where: {
        uid: fileId,
        uid_dono: uid,
      },
    });
    await fs.remove(arquivo.caminho);
    return res.status(200).json({ mensagem: "Arquivo removido com sucesso" });
  });
}

module.exports = {
  apagar,
};
