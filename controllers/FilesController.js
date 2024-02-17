const Usuario = require("../models/usuarios");
const arquivosModel = require("../models/arquivos");
const fs = require("fs-extra");
const jwt = require("jsonwebtoken");

// Função auxiliar para verificar token
const verificarToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, "seu_secret_jwt", (err, decoded) => {
      if (err) {
        reject("Token inválido");
      } else {
        resolve(decoded);
      }
    });
  });
};

// Função para apagar arquivo
async function apagar(req, res) {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ erro: "Token não informado" });
    }

    const decoded = await verificarToken(token);
    const { id } = req.body;
    const fileId = id;
    const arquivo = await arquivosModel.findOne({
      where: {
        uid: id,
        uid_dono: decoded.uid,
      },
    });

    if (!arquivo) {
      return res.status(404).json({ erro: "Arquivo não encontrado" });
    }

    await arquivosModel.destroy({
      where: {
        uid: fileId,
        uid_dono: decoded.uid,
      },
    });

    await fs.remove(arquivo.caminho);
    //atualizar storage do usuario
    const usuario = await Usuario.findByPk(decoded.uid);
    const novoStorage = parseFloat(usuario.storage) + parseFloat(arquivo.size);
    await Usuario.update(
      { storage: novoStorage },
      { where: { uid: decoded.uid } }
    );
    return res.status(200).json({ mensagem: "Arquivo removido com sucesso" });
  } catch (erro) {
    if (erro === "Token inválido") {
      return res.status(401).json({ erro });
    } else {
      console.error(erro);
      return res.status(500).json({ erro: "Erro ao processar a solicitação" });
    }
  }
}

module.exports = {
  apagar,
};
