const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors"); // Importe o CORS
const app = express();
const port = 3002;

var logger = require("morgan");

const fs = require("fs-extra");

const moment = require("moment");

const sequelize = require("./config/config"); // Importa a instância do Sequelize
const Usuario = require("./models/usuarios"); // Importa o modelo de usuários
const Arquivo = require("./models/arquivos");
const IPS = require("./models/ips");
const WALogin = require("./models/walogin"); // Importa o modelo de arquivos
const nodemailer = require("nodemailer");
const Cob = require("./models/cob");
const arquivosModel = require("./models/arquivos");
const { v4: uuidv4 } = require("uuid");
const UsuarioController = require("./controllers/UsuarioController");
const FilesController = require("./controllers/FilesController");
const WAController = require("./controllers/WAController");
const crypto = require("crypto");
const qrcode = require("./models/qrcode");
const cron = require("node-cron");

const WebToken = require("./models/webtoken");

const jwt = require("jsonwebtoken");

function obterIpReal(req) {
  return req.headers["cf-connecting-ip"] || req.connection.remoteAddress;
}

async function registrarIP(req, res, next) {
  const ip = req.headers["cf-connecting-ip"] || req.connection.remoteAddress;

  try {
    // Verifica se o IP já está cadastrado no banco de dados
    const ipExistente = await IPS.findOne({ where: { ip } });

    // Se o IP não existir, cria um novo registro no banco de dados
    if (!ipExistente) {
      await IPS.create({ ip });
    } else {
      // Se o IP existir, verifica se está bloqueado
      if (ipExistente.bloqueado) {
        console.log("IP bloqueado:", ip);
        return res.status(403).send("Acesso proibido para este IP");
      }
    }

    // Chama a função next() para continuar o fluxo da solicitação
    next();
  } catch (error) {
    console.error("Erro ao registrar o IP:", error);
    return res.status(500).send("Erro interno do servidor");
  }
}

const transporter = nodemailer.createTransport({
  host: "mail.viniciusdev.com.br",
  port: 587,
  secure: false,
  auth: {
    user: "suv@viniciusdev.com.br",
    pass: "9778",
  },
});

//definir a pasta uploads como publica

const Sequelize = require("sequelize");
const { Op } = require("sequelize");

async function verificarCotas() {
  try {
    // Busca todos os arquivos
    const arquivos = await Arquivo.findAll();

    for (const arquivo of arquivos) {
      // Busca o usuário correspondente manualmente
      const usuario = await Usuario.findByPk(arquivo.uid_dono);

      // Define o valor de 1GB em bytes
      const umGBEmBytes = 1024 ** 3;
      console.log("umGBEmBytes", umGBEmBytes);

      // Verifica se o limite de armazenamento está configurado para 1GB
      console.log(`O limite  ${usuario.nome} não está para 1GB.`);
      if (arquivo.size > usuario.storage) {
        console.log(
          `O arquivo ${arquivo.nome} (${arquivo.size} bytes) excede a cota do usuário ${usuario.nome} (${usuario.storage} bytes).`
        );

        await Arquivo.destroy({ where: { uid: arquivo.uid } });
        console.log(
          `Registro do arquivo ${arquivo.nome} removido com sucesso do banco de dados.`
        );

        //atualzar storage adicionando o tamanho do arquivo fazendo a soma
        const novoStorage = usuario.storage + arquivo.size;
        await fs.remove(arquivo.caminho);
        await Usuario.update(
          { storage: novoStorage },
          { where: { uid: usuario.uid } }
        );
        await transporter.sendMail({
          from: "suv@viniciusdev.com.br",
          to: usuario.email, // Certifique-se de que o modelo Usuario tenha um campo email
          subject: "Cota de armazenamento excedida",
          text: `Olá ${usuario.nome}, seu arquivo ${arquivo.nome} foi removido porque excedeu a cota de armazenamento permitida. seu espaço foram corrigidos.`,
        });

        // Seu código para lidar com a remoção do arquivo e notificação ao usuário
      } else {
        console.log(
          `O arquivo ${arquivo.nome} (${arquivo.size} bytes) não excede a cota do usuário ${usuario.nome} (${usuario.storage} bytes).`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao verificar cotas:", error);
  }
}

async function corrigirStorageNegativo() {
  try {
    // Buscar todos os usuários com storage negativo
    const usuariosComStorageNegativo = await Usuario.findAll({
      where: {
        storage: { [Sequelize.Op.lt]: 0 }, // "Menor que 0"
      },
    });

    for (const usuario of usuariosComStorageNegativo) {
      // Buscar os arquivos associados a esse usuário
      const arquivosUsuario = await Arquivo.findAll({
        where: { uid_dono: usuario.uid },
      });

      let totalTamanhoRemovido = 0;

      for (const arquivo of arquivosUsuario) {
        try {
          // Tenta remover o arquivo do sistema de arquivos
          await fs.remove(arquivo.caminho);
          console.log(
            `Arquivo ${arquivo.nome} removido com sucesso do sistema de arquivos.`
          );

          // Acumula o tamanho dos arquivos removidos para ajustar o storage do usuário
          totalTamanhoRemovido += arquivo.size;

          // Remove o registro do arquivo no banco de dados
          await Arquivo.destroy({ where: { id: arquivo.id } });
          console.log(
            `Registro do arquivo ${arquivo.nome} removido com sucesso do banco de dados.`
          );
        } catch (error) {
          console.error(`Erro ao remover o arquivo ${arquivo.nome}: ${error}`);
        }
      }

      // Atualiza o storage do usuário
      if (totalTamanhoRemovido > 0) {
        // Aqui você pode escolher recalcular o storage a partir dos arquivos restantes
        // ou simplesmente ajustar o storage atual. Exemplo de ajuste direto:
        const novoStorage = usuario.storage + totalTamanhoRemovido;
        await Usuario.update(
          { storage: novoStorage },
          { where: { uid: usuario.uid } }
        );
        console.log(
          `Storage do usuário ${usuario.nome} atualizado para ${novoStorage} bytes.`
        );
      }
    }
    console.log("Processo de correção de storage negativo concluído.");
  } catch (error) {
    console.error("Erro ao corrigir storage negativo:", error);
  }
}

//cron.schedule("*/3 * * * *", corrigirStorageNegativo);

async function sincronizarBancoDeDados() {
  try {
    // Sincroniza todos os modelos com o banco de dados
    await sequelize.sync({ force: false }); // Use { force: true } com cuidado, pois isso irá destruir/recriar tabelas
    console.log("Todas as tabelas foram criadas com sucesso.");
  } catch (error) {
    console.error("Erro ao sincronizar o banco de dados:", error);
  }
}
//cron.schedule("*/3 * * * *", verificarCotas);
//verificarCotas();
sincronizarBancoDeDados();

// Permita solicitações de diferentes origens
app.use(cors());

app.use(logger("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "800mb" }));
app.use(bodyParser.urlencoded({ limit: "800mb", extended: true }));

app.post("/new_user", registrarIP, UsuarioController.criarUsuario);
app.post("/login", registrarIP, UsuarioController.fazerLogin);
app.post("/login/wa", registrarIP, UsuarioController.fazerLoginWA);

app.post("/dashboard", registrarIP, UsuarioController.dashboard);

app.get("/download", registrarIP, UsuarioController.download);

app.get("/verificar-email", registrarIP, UsuarioController.verificarEmail);
app.post("/delete_event", registrarIP, FilesController.apagar);
app.post("/change_plan", registrarIP, UsuarioController.MudarPlano);

app.post("/wabot/check", registrarIP, WAController.check);
app.post("/wabot/logout", registrarIP, WAController.logout);
app.post("/wabot/arquivos", registrarIP, WAController.arquivos);
app.get("/wabot/link", registrarIP, WAController.handler);
app.use("/uploads", express.static("./uploads"));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.get("/admsupremo", async (req, res) => {
  try {
    // Consulta todos os usuários e seleciona todos os campos do modelo Usuario
    const usuarios = await Usuario.findAll();

    // Renderiza a página index.ejs e passa os dados dos usuários como contexto
    res.render("index", { usuarios });
  } catch (error) {
    console.error("Erro ao obter usuários:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

app.get("/visualizar_arquivos/:uid", async (req, res) => {
  const uid = req.params.uid;

  try {
    // Consulta os arquivos do usuário com base no uid
    const arquivos = await Arquivo.findAll({ where: { uid_dono: uid } });

    // Renderiza a página visualizar_arquivos.ejs e passa os dados dos arquivos como contexto
    res.render("visualizar_arquivos", { arquivos });
  } catch (error) {
    console.error("Erro ao obter arquivos do usuário:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

app.post("/register_qr", registrarIP, async (req, res) => {
  try {
    const { token, unico } = req.body;

    // Supondo que qrcode.create retorna uma promise
    await qrcode.create({ token: token, unico: unico });

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro ao registrar QR:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/check_qr", registrarIP, async (req, res) => {
  try {
    const { token } = req.body;

    // Consulta o banco de dados para encontrar o QRCode com base no token fornecido
    const qr = await qrcode.findOne({ where: { unico: token } });

    if (qr) {
      // Se o QRCode for encontrado, retorna o valor da coluna 'perm'
      res.json({ token: qr.perm });
    } else {
      // Se o QRCode não for encontrado, retorna uma mensagem de erro
      res.status(404).json({ error: "QR não encontrado" });
    }
  } catch (error) {
    // Se ocorrer um erro durante a consulta, retorna uma mensagem de erro genérica
    console.error("Erro ao consultar QR no banco de dados:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/saveqr", registrarIP, async (req, res) => {
  try {
    const { token, perm } = req.body;

    // Verifica se o token fornecido está presente na requisição
    if (!token || !perm) {
      return res
        .status(400)
        .json({ error: "Token ou perm ausente na solicitação" });
    }

    // Atualiza o QRCode com base no token fornecido
    const updatedRows = await qrcode.update(
      { perm: perm },
      { where: { token: token } }
    );

    if (updatedRows > 0) {
      return res.json({ status: "ok" }); // Retorna uma resposta de sucesso
    } else {
      // Se o QRCode não for encontrado, retorna uma mensagem de erro
      return res.status(404).json({ error: "QR não encontrado" });
    }
  } catch (error) {
    // Se ocorrer um erro durante o processo, retorna uma mensagem de erro genérica
    console.error("Erro ao salvar QR no banco de dados:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/regen_event", registrarIP, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ error: "Nenhum token fornecido." });
    }

    const fileid = req.body.fileid;

    let decoded;
    try {
      // Substitua 'seu_secret_jwt' pela sua chave secreta real
      decoded = jwt.verify(authHeader, "seu_secret_jwt");
    } catch (error) {
      return res.status(401).send({ error: "Token inválido." });
    }

    const short = await arquivosModel.findOne({
      where: { uid: fileid },
    });

    // verificar se decoded.uid é igual a short.uid_dono
    if (decoded.uid !== short.uid_dono) {
      return res.status(401).send({ error: "Token inválido." });
    }

    // Gerar um novo valor UUIDv4
    short.short = crypto.randomBytes(5).toString("hex");

    // Salvar as alterações no banco de dados
    await short.save();

    return res.status(200).send({ short: short.short });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Erro interno do servidor." });
  }
});

app.post(
  "/upload_event",
  registrarIP,
  UsuarioController.uploadEvent,
  UsuarioController.handleUpload
);

function gbParaBytes(gb) {
  return gb * 1024 * 1024 * 1024; // GB * MB * KB * Bytes
}
function calcularExpiracaoEmMilissegundos() {
  // Obtém a data atual
  const agora = moment();
  // Calcula a data de expiração adicionando 30 dias à data atual
  const expiracao = agora.add(30, "days");
  // Retorna a data de expiração em milissegundos
  return expiracao.valueOf();
}

function verificarExpiracaoAssinatura(expiracaoEmMilissegundos) {
  // Obtém a data e hora atual
  const agora = moment();
  // Converte o timestamp de expiração em milissegundos para um objeto moment
  const dataDeExpiracao = moment(expiracaoEmMilissegundos);

  // Verifica se a data atual é após a data de expiração
  if (agora.isAfter(dataDeExpiracao)) {
    return "expired";
  } else {
    return "valid";
  }
}

// Exemplo de uso:
// Substitua 'expiracaoEmMilissegundos' pelo timestamp em milissegundos da data de expiração da assinatura
const expiracaoEmMilissegundos = calcularExpiracaoEmMilissegundos(); // Função anterior
const statusDaAssinatura = verificarExpiracaoAssinatura(
  expiracaoEmMilissegundos
);
console.log(statusDaAssinatura);

const { verificarPix } = require("./config/Efi");

async function ListarCobrancas() {
  console.log("Iniciando ListarCobrancas");
  const cobrancas = await Cob.findAll();
  console.log(`Total de cobranças encontradas: ${cobrancas.length}`);

  async function atraso(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function verificarEProcessarCobranca(cobranca) {
    console.log(`Processando cobrança com txid: ${cobranca.txid}`);
    try {
      const resposta = await verificarPix(cobranca.txid);
      console.log(
        `Resposta da verificação do PIX para txid ${cobranca.txid}:`,
        resposta
      );

      // Exclui a cobrança imediatamente se a transação foi concluída ou não, para evitar reprocessamento

      console.log(`Cobrança com UID ${cobranca.uid} excluída com sucesso.`);

      if (resposta.status === "CONCLUIDA") {
        console.log(
          `Cobrança ${cobranca.txid} concluída, buscando usuário com email: ${cobranca.email}`
        );
        const usuario = await Usuario.findOne({
          where: { email: cobranca.email },
        });
        console.log(`Usuário encontrado:`, usuario);

        await Cob.destroy({ where: { txid: cobranca.txid } });
        console.log(`Cobrança com txid ${cobranca.txid} excluída com sucesso.`);

        let novoStorage;
        const _5gb = 5368709120;
        const _15gb = 16106127360;
        const _50gb = 53687091200;
        const storageInicial = parseFloat(usuario.storage);
        switch (cobranca.plano) {
          case "5GB":
            novoStorage = storageInicial + _5gb;
            break;
          case "15GB":
            novoStorage = storageInicial + _15gb;
            break;
          case "50GB":
            novoStorage = storageInicial + _50gb;
            break;
          default:
            novoStorage = storageInicial; // Caso não corresponda a nenhum plano específico
        }

        console.log(`Novo storage após atualização: ${novoStorage}`);

        await Usuario.update(
          {
            storage: novoStorage,
            planos: cobranca.plano,
            expira_em: calcularExpiracaoEmMilissegundos(),
          },
          { where: { email: cobranca.email } }
        );
        console.log(
          `Usuário com email ${cobranca.email} atualizado com sucesso.`
        );
        return;
      } else {
        console.log(
          `Cobrança ${cobranca.txid} não está concluída. Status: ${resposta.status}`
        );
        // Não é necessário reagendar para 2 a 3 minutos depois, pois a cobrança já foi excluída
      }
    } catch (error) {
      console.error("Erro ao verificar PIX ou atualizar usuário:", error);
    }

    // Ajuste o atraso para 1000 ms (1 segundo) conforme solicitado
    await atraso(1000);
  }

  for (const cobranca of cobrancas) {
    setTimeout(() => {
      verificarEProcessarCobranca(cobranca);
    }, 1000);
  }
}

app.get("/", registrarIP, (req, res) => {
  res.send("SERVIDOR DO SITE SERVIDOR.VINICIUSDEV.COM.BR");
});

app.post("/new_remote", registrarIP, async (req, res) => {
  const { token, celular } = req.body;
  await WebToken.create({ uuid: token, celular: celular });

  res.json({ site: `https://viniciusdev.com.br/authorize?token=${token}` });
});

app.post("/consultar_token", async (req, res) => {
  const { token } = req.body;
  await WebToken.findOne({ where: { uuid: token } }).then((token) => {
    if (token) {
      res.json({ jwt: token.token });
    } else {
      res.json({ error: "Token não encontrado" });
    }
  });
});

app.post("/registrar_auth", async (req, res) => {
  const { token, auth } = req.body;
  await WebToken.findOne({ where: { uuid: token } }).then((token) => {
    if (token) {
      token.token = auth;
      token.save();
      res.json({ status: "ok" });
    } else {
      res.json({ error: "Token não encontrado" });
    }
  });
});

//rota para o cron
app.get("/cron", (req, res) => {
  ListarCobrancas();
  res.send("Cron executado");
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
