const WALogin = require("../models/walogin");
const Usuario = require("../models/usuarios");
const Arquivo = require("../models/arquivos");

async function check(req, res) {
  const { numero } = req.body;

  const wa = await WALogin.findOne({ where: { numero } });
  if (wa) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(200).json({ valid: false });
  }
}

async function logout(req, res) {
  const { numero } = req.body;
  const wa = await WALogin.findOne({ where: { numero } });
  if (wa) {
    await wa.destroy();
    return res.status(200).json({ valid: true });
  } else {
    return res.status(200).json({ valid: false });
  }
}

async function handler(req, res) {
  const { token } = req.query;
}

async function arquivos(req, res) {
  const { numero } = req.body;
  const wa = await WALogin.findOne({ where: { numero } });
  if (wa) {
    //obter email
    const email = wa.email;
    //buscar uid do usuário pelo email
    const user = await Usuario.findOne({ where: { email } });
    if (user) {
      //buscar arquivos do usuário
      const arquivos = await Arquivo.findAll({ where: { uid_dono: user.uid } });
      return res.status(200).json({ valid: true, arquivos });
    } else {
      return res.status(200).json({ valid: false });
    }
  } else {
    return res.status(200).json({ valid: false });
  }
}

module.exports = {
  check,
  arquivos,
  handler,
  logout,
};
