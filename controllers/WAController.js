const WALogin = require("../models/walogin");

async function sign(req, res) {
  const { numero } = req.body;

  const login = await WALogin.create({
    numero,
  });

  const uid = login.uid;
  return res.json({ link: `https://cdn.viniciusdev.com.br/wabot/link/${uid}` });
}

module.exports = {
  sign,
};
