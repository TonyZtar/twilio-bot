const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');
const db = require('./firebase'); // 🔗 conexión a Firestore

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: false }));

const usuariosSaludados = new Set();

app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const numero = req.body.From;
  const msg = req.body.Body?.replace(/\s/g, '').toUpperCase();

  console.log(`📥 Mensaje recibido de ${numero}: "${msg}"`);

  // Bienvenida
  if (!usuariosSaludados.has(numero)) {
    usuariosSaludados.add(numero);
    twiml.message('👋 Bienvenido.\n\nIngrese Kanban o Número de parte.');
    return res.type('text/xml').send(twiml.toString());
  }

  // Validación vacía
  if (!msg) {
    twiml.message('Por favor, ingrese un Kanban o número de parte.');
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    const snapshot = await db.collection('materiales').get();
    const materiales = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.KANBAN?.toUpperCase() === msg || data.Part?.toUpperCase() === msg) {
        materiales.push(data);
      }
    });

    if (materiales.length === 0) {
      twiml.message('Información incorrecta.');
    } else {
      const mat = materiales[0];
      twiml.message(
        `📦 *Resultado:*\n\n` +
        `🔹 *KANBAN:* ${mat.KANBAN}\n` +
        `🔹 *Parte:* ${mat.Part}\n` +
        `🔹 *Proveedor:* ${mat.Supplier}\n` +
        `🔹 *Nombre Proveedor:* ${mat.SupplierName}\n` +
        `🔹 *Nombre Parte:* ${mat.PartName}\n` +
        `🔹 *DOCK:* ${mat.DOCK}\n` +
        `🔹 *Analista:* ${mat.Analyst}\n` +
        `🔹 *SubRuta:* ${mat.SubRoute}\n` +
        `🔹 *Ruta Principal:* ${mat.MainRoute}\n` +
        `🔹 *Uso:* ${mat.Usage}`
      );
    }

  } catch (error) {
    console.error('❌ Error al consultar Firestore:', error);
    twiml.message('Hubo un error al buscar el material. Intenta más tarde.');
  }

  res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});
