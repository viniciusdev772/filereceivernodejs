const WALogin = require("../models/walogin");

async function check(req, res) {
  const { numero } = req.body;

  const wa = await WALogin.findOne({ where: { numero } });
  if (wa) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(200).json({ valid: false });
  }
}

async function handler(req, res) {
  const { token } = req.query;
}

module.exports = {
  check,
  handler,
};
