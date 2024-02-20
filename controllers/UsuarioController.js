const Usuario = require("../models/usuarios");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");

const moment = require("moment");
require("moment-timezone");

//importar funcao de pagamento
const { criarPagamentoPix } = require("../config/Efi");

const arquivosModel = require("../models/arquivos");
const WALogin = require("../models/walogin");
const Cob = require("../models/cob");
const fs = require("fs-extra");
const QRCode = require("qrcode");
const { link } = require("fs");
///dff
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uniqueId = uuidv4();
    const destinationPath = `uploads/${uniqueId}`;

    // Armazena o caminho no objeto req para acesso posterior
    req.filePath = destinationPath;

    // Verifica se a pasta existe e a cria se necessário
    await fs.ensureDir(destinationPath);

    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const uploadEvent = upload.single("arquivo");

function formatarExpiracaoLogin(valorExpiraEm) {
  if (!valorExpiraEm) {
    return "Informação de expiração não disponível.";
  }

  // Tenta converter para número, caso seja um timestamp em string
  const timestamp = Number(valorExpiraEm) || valorExpiraEm;
  const expiracao = moment(timestamp).tz("America/Sao_Paulo");

  const agora = moment().tz("America/Sao_Paulo");
  const diferenca = moment.duration(expiracao.diff(agora));

  if (diferenca.asMilliseconds() <= 0) {
    return "Seu login já expirou.";
  }

  const dias = diferenca.days();
  const horas = diferenca.hours();
  const minutos = diferenca.minutes();
  const segundos = diferenca.seconds();

  return ` em ${dias} dia(s), ${horas} hora(s), ${minutos} minuto(s) e ${segundos} segundo(s).`;
}

async function handleUpload(req, res) {
  try {
    // Acessa o cabeçalho Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({ error: "Nenhum token fornecido." });
    }
    const caminhoCompleto = `${req.filePath}/${req.file.filename}`; // Constrói o caminho completo

    console.log(caminhoCompleto); // Exibe o caminho completo no console

    //cadastra o arquivo no banco de dados

    let decoded;
    try {
      decoded = jwt.verify(authHeader, "seu_secret_jwt");
      // Substitua 'suaChaveSecreta' pela sua chave secreta real
      const usuario = await Usuario.findOne({ where: { uid: decoded.uid } });

      // Verifica se o usuário tem espaço suficiente para o novo arquivo
      if (usuario.storage < req.file.size) {
        return res
          .status(400)
          .send({ error: "Espaço de armazenamento insuficiente." });
      }
      const arquivo = await arquivosModel.create({
        size: req.file.size,
        nome: req.file.originalname,
        caminho: caminhoCompleto,
        uid_dono: decoded.uid,
      });

      //descontar o espaço de armazenamento do usuário

      const novoStorage = usuario.storage - req.file.size;
      await usuario.update({ storage: novoStorage });

      if (arquivo) {
        return res.status(201).send({ message: "Arquivo salvo com sucesso." });
      } else {
        res.status(500).send({ error: "Erro ao salvar o arquivo." });
      }
    } catch (error) {
      return res.status(401).send({ error: "Token inválido." });
    }

    console.log(req.file);

    const nomeArquivo = req.file.filename; // Nome do arquivo salvo

    // Envia uma resposta incluindo informações do usuário decodificado e do arquivo
    res.send({
      message: "Arquivo recebido com sucesso!",
      arquivo: nomeArquivo,
      usuario: decoded, // Informações do usuário decodificado do token
    });
  } catch (error) {
    console.error("Erro no upload do arquivo:", error);
    res.status(500).send({ error: "Erro no processamento do arquivo." });
  }
}

// Configuração do transporter do nodemailer
const transporter = nodemailer.createTransport({
  host: "mail.viniciusdev.com.br",
  port: 587,
  secure: false,
  auth: {
    user: "suv@viniciusdev.com.br",
    pass: "9778",
  },
});

async function fazerLogin(req, res) {
  try {
    const { email, senha } = req.body;
    // Gera o hash MD5 da senha fornecida para comparação
    const hashSenha = crypto.createHash("md5").update(senha).digest("hex");

    // Busca o usuário pelo email
    const usuario = await Usuario.findOne({ where: { email } });

    // Verifica se o usuário existe e se a senha está correta
    if (!usuario || usuario.senha !== hashSenha) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    // Verifica se o email foi verificado
    if (!usuario.emailVerificado) {
      return res.status(200).json({
        error: "Email não verificado. Por favor, verifique seu email.",
      });
    }

    // Cria o token JWT
    const token = jwt.sign(
      {
        uid: usuario.uid,
        email: usuario.email,
        nome: usuario.nome,
        storage: usuario.storage,
      },
      "seu_secret_jwt",
      {
        expiresIn: "7d",
      }
    );

    // Retorna o token ao usuário
    res.status(200).json({
      message: "Login realizado com sucesso",
      uid: usuario.uid,
      email: usuario.email,
      nome: usuario.nome,
      storage: usuario.storage,
      plano: usuario.planos,
      token,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
}

//importar model WALogin

async function fazerLoginWA(req, res) {
  try {
    const { email, senha, numero } = req.body;
    // Gera o hash MD5 da senha fornecida para comparação
    const hashSenha = crypto.createHash("md5").update(senha).digest("hex");

    // Busca o usuário pelo email
    const usuario = await Usuario.findOne({ where: { email } });

    // Verifica se o usuário existe e se a senha está correta
    if (!usuario || usuario.senha !== hashSenha) {
      return res.status(200).json({ error: "Email ou senha inválidos" });
    }

    // Verifica se o email foi verificado
    if (!usuario.emailVerificado) {
      return res.status(200).json({
        error: "Email não verificado. Por favor, verifique seu email.",
      });
    }

    // Cria o token JWT
    const token = jwt.sign(
      {
        uid: usuario.uid,
        email: usuario.email,
        nome: usuario.nome,
        storage: usuario.storage,
      },
      "seu_secret_jwt",
      {
        expiresIn: "7d",
      }
    );

    // Retorna o token ao usuário
    res.status(200).json({
      message: "Login realizado com sucesso",
      uid: usuario.uid,
      email: usuario.email,
      nome: usuario.nome,
      storage: usuario.storage,
      plano: usuario.planos,
      token,
    });

    await WALogin.create({
      numero,
      email: usuario.email,
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(200).json({ error: "Erro ao fazer login" });
  }
}

async function criarUsuario(req, res) {
  try {
    const { email, senha, nome } = req.body;
    const novoUsuario = await Usuario.create({ email, senha, nome });

    // Envia o email de verificação
    const urlVerificacao = `https://${req.hostname}/verificar-email?token=${novoUsuario.tokenVerificacaoEmail}`;
    await transporter.sendMail({
      from: '"SERVER VDEV" <suv@viniciusdev.com.br>',
      to: novoUsuario.email,
      subject: "Verifique seu endereço de email",
      html: `<h4>Olá, ${novoUsuario.nome}</h4>
               <p>Obrigado por se registrar. Por favor, clique no link abaixo para verificar seu email e ativar sua conta:</p>
               <a href="${urlVerificacao}">${urlVerificacao}</a>
               <p>Como usuário, você terá um limite de 1GB para o envio de todo tipo de arquivo. Aproveite ao máximo o espaço disponível para gerenciar seus arquivos de forma eficiente.</p>
               <p>Precisa de mais que 1GB ? Temos planos de até 5GB</p>`,
    });

    res.status(201).json({
      message:
        "Usuário criado com sucesso. Verifique seu email para ativar sua conta.",
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
}

async function verificarEmail(req, res) {
  try {
    const { token } = req.query; // Assumindo que o token é enviado como um parâmetro de consulta

    // Busca o usuário pelo token de verificação de email
    const usuario = await Usuario.findOne({
      where: { tokenVerificacaoEmail: token },
    });

    if (!usuario) {
      //retornar texto
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    // Atualiza o usuário como verificado
    await usuario.update({
      emailVerificado: true,
      tokenVerificacaoEmail: null,
    }); // Remove o token após a verificação

    res
      .status(200)
      .json({ message: "Email verificado com sucesso. Sua conta está ativa." });
  } catch (error) {
    console.error("Erro ao verificar o email:", error);
    res.status(500).json({ error: "Erro ao verificar o email" });
  }
}

async function dashboard(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ error: "Nenhum token fornecido." });
    }

    let decoded;
    try {
      // Substitua 'seu_secret_jwt' pela sua chave secreta real
      decoded = jwt.verify(authHeader, "seu_secret_jwt");
    } catch (error) {
      return res.status(401).send({ error: "Token inválido." });
    }

    // Busca todos os arquivos relacionados ao UID do usuário decodificado
    const arquivos = await arquivosModel.findAll({
      where: { uid_dono: decoded.uid },
    });

    const espaco = await Usuario.findOne({ where: { uid: decoded.uid } });

    const restam = espaco.storage;
    const ESPACO_TOTAL_DISPONIVEL = 10 * 1024 * 1024 * 1024; // 10 GB em bytes

    const tamanhoTotal = arquivos.reduce(
      (acc, arquivo) => acc + arquivo.size,
      0
    );

    // Calcula o espaço disponível
    const espacoDisponivel = espaco.storage;

    let expiracao88 = "";
    if (espaco.planos !== "free") {
      expiracao88 = formatarExpiracaoLogin(espaco.expira_em);
    }

    // Prepara um array JSON com os arquivos
    const arquivosJson = arquivos.map((arquivo) => ({
      id: arquivo.uid,
      nome: arquivo.nome,
      caminho: arquivo.caminho,
      size: arquivo.size,
      short: arquivo.short,
      link: `https://${req.hostname}/download?token=${arquivo.short}`,
      createdAt: arquivo.createdAt,
      // Adicione outros campos conforme necessário
    }));

    // Retorna apenas o array de arquivos relacionados ao usuário
    res.status(200).json({
      arquivos: arquivosJson,
      espacoDisponivel,
      plano: espaco.planos,
      expiracao: expiracao88,
    });
  } catch (error) {
    console.error("Erro ao acessar o dashboard:", error);
    res.status(500).json({ error: "Erro ao acessar o dashboard" });
  }
}

async function download(req, res) {
  try {
    // Recupera o token da URL
    const { token } = req.query;

    // Busca no banco de dados pelo 'short' que corresponde ao token
    const arquivo = await arquivosModel.findOne({ where: { short: token } });

    // Se nenhum arquivo for encontrado, envia uma resposta de erro
    if (!arquivo) {
      return res.status(404).send("Arquivo não encontrado.");
    }

    // Recupera o caminho do arquivo
    const caminho = arquivo.caminho;

    // Faz o download do arquivo para o usuário
    res.download(caminho, (err) => {
      if (err) {
        // Log do erro
        console.error("Erro ao fazer download do arquivo:", err);
        // Verifica se os cabeçalhos ainda não foram enviados para o cliente
        if (!res.headersSent) {
          // Em caso de erro no download, envia uma resposta de erro
          return res.status(500).send("Erro ao fazer download do arquivo.");
        }
      }
    });
  } catch (error) {
    console.error("Erro ao processar o download:", error);
    // Verifica se os cabeçalhos ainda não foram enviados para o cliente
    if (!res.headersSent) {
      // Em caso de erro na busca ou qualquer outro erro, envia uma resposta de erro genérico
      return res
        .status(500)
        .send("Erro ao processar a solicitação de download.");
    }
  }
}

const generateQR = async (text) => {
  try {
    const url = await QRCode.toDataURL(text);
    return url; // Retorna a URL do QR Code gerado
  } catch (err) {
    console.error(err);
    return null; // Retorna nulo em caso de erro
  }
};

async function MudarPlano(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ error: "Nenhum token fornecido." });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader, "seu_secret_jwt"); // Substitua 'seu_secret_jwt' pela sua chave secreta real
    } catch (error) {
      return res.status(401).send({ error: "Token inválido." });
    }

    const usuario = await Usuario.findOne({ where: { uid: decoded.uid } });
    if (!usuario) {
      return res.status(404).send({ error: "Usuário não encontrado." });
    }

    const { plano } = req.body;
    const numeroPedido = uuidv4();

    const valorPlanos = {
      "5GB": "1.99",
      "15GB": "39.99",
      "50GB": "99.99",
    };

    if (!valorPlanos[plano]) {
      return res.status(400).send({ error: "Plano não suportado." });
    }

    try {
      const respostaPagamento = await criarPagamentoPix(
        valorPlanos[plano],
        numeroPedido
      );

      await Cob.create({
        txid: respostaPagamento.txid,
        email: usuario.email,
        plano: plano,
      });

      const qrCodeURL = await QRCode.toDataURL(respostaPagamento.pixCopiaECola);

      await transporter.sendMail({
        from: '"SERVER VDEV" <suv@viniciusdev.com.br>',
        to: usuario.email,
        subject: `Seu pedido de ${plano}`,
        text: `Olá, ${usuario.nome}. Seu pedido de pagamento PIX foi criado com sucesso. O número do pedido é ${numeroPedido}.`,
        html: `<p>Olá, ${usuario.nome}. Seu pedido de pagamento PIX foi criado com sucesso. O número do pedido é ${numeroPedido}.</p><p><img src="${qrCodeURL}" alt="QR Code de Pagamento"/></p>`,
      });

      return res.status(200).send({
        message: "Efetue o pagamento PIX para ativar o novo plano de ." + plano,
        qrCodeText: respostaPagamento.pixCopiaECola,
        qrCodeImg: qrCodeURL,
      });
    } catch (error) {
      console.error("Erro ao criar pagamento PIX:", error);
      return res.status(500).send({ error: "Erro ao processar pagamento PIX" });
    }
  } catch (error) {
    console.error("Erro ao mudar o plano:", error);
    return res.status(500).send({ error: "Erro ao mudar o plano" });
  }
}

module.exports = {
  criarUsuario,
  MudarPlano,
  download,
  verificarEmail,
  fazerLogin,
  uploadEvent,
  dashboard,
  handleUpload,
  fazerLoginWA,
};
