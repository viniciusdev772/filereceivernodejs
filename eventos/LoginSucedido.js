const axios = require("axios");
const nodemailer = require("nodemailer");
const moment = require("moment");

// Configuração do transporte do Nodemailer
const transporter = nodemailer.createTransport({
  host: "mail.viniciusdev.com.br",
  port: 587,
  secure: false,
  auth: {
    user: "suv@viniciusdev.com.br",
    pass: "9778",
  },
});

// Função para obter a localização a partir do IP usando ip-api.com
async function obterLocalizacaoPorIP(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return {
      city: response.data.city,
      country: response.data.country,
    };
  } catch (error) {
    console.error("Erro ao obter localização por IP:", error);
    return null;
  }
}

// Função para enviar e-mail de login bem-sucedido
async function enviarEmailLoginSucedido(email, ip, nomeUsuario) {
  const horaBrasilia = moment()
    .utcOffset("-03:00")
    .format("HH:mm:ss, DD/MM/YYYY");
  const localizacao = await obterLocalizacaoPorIP(ip);

  if (localizacao) {
    const emailContent = `
      <h1>Login Aprovado</h1>
      <p>Olá ${nomeUsuario},</p>
      <p>Identificamos um novo login no IP ${ip} perto de ${localizacao.city}, ${localizacao.country}.</p>
      <p>No horário ${horaBrasilia} (horário de Brasília).</p>
      <p>Obrigado por usar nosso serviço!</p>
    `;

    const mailOptions = {
      from: "suv@viniciusdev.com.br",
      to: email,
      subject: "Login Sucessido",
      html: emailContent,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Erro ao enviar e-mail:", error);
      } else {
        console.log("E-mail enviado com sucesso:", info.response);
      }
    });
  } else {
    console.log("Não foi possível obter a localização para o IP:", ip);
  }
}

// Função para enviar e-mail de login mal-sucedido
async function enviarEmailLoginMalSucedido(email, ip, nomeUsuario, motivo) {
  const horaBrasilia = moment()
    .utcOffset("-03:00")
    .format("HH:mm:ss, DD/MM/YYYY");
  const localizacao = await obterLocalizacaoPorIP(ip);

  if (localizacao) {
    const emailContent = `
      <h1>Login mal Sucedido</h1>
      <p>Olá ${nomeUsuario},</p>
      <p>Identificamos uma tentativa de login mal-sucedida no IP ${ip}, localizado em ${localizacao.city}, ${localizacao.country}.</p>
      <p>Motivo: ${motivo}</p>
      <p>No horário ${horaBrasilia} (horário de Brasília).</p>
      <p>Por favor, verifique suas credenciais e tente novamente.</p>
    `;

    const mailOptions = {
      from: "suv@viniciusdev.com.br",
      to: email,
      subject: "Tentativa de Login Mal-Sucedido",
      html: emailContent,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Erro ao enviar e-mail:", error);
      } else {
        console.log("E-mail enviado com sucesso:", info.response);
      }
    });
  } else {
    console.log("Não foi possível obter a localização para o IP:", ip);
  }
}

// Exportando as funções
module.exports = {
  enviarEmailLoginSucedido,
  enviarEmailLoginMalSucedido,
};
