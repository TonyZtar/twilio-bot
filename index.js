const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');
const db = require('./firebase');

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const msg = req.body.Body?.trim();
  const numero = req.body.From;

  console.log(`📥 Mensaje recibido de ${numero}: "${msg}"`);

  // Si escriben "HOLA"
  if (msg && msg.toLowerCase() === 'hola') {
    console.log('👋 Enviando mensaje de bienvenida');
    twiml.message('👋 Bienvenido.\n\nIngrese Kanban o Número de parte.');
    return res.type('text/xml').send(twiml.toString());
  }

  // Buscar en Firestore
  try {
    console.log('🔍 Buscando por KANBAN...');
    const snapshot = await db.collection('materiales')
      .where('KANBAN', '==', msg)
      .get();

    if (snapshot.empty) {
      console.log('❌ No encontrado por KANBAN. Buscando por Part...');
      const partSnap = await db.collection('materiales')
        .where('Part', '==', msg)
        .get();

      if (partSnap.empty) {
        console.log('❌ No encontrado por Part tampoco.');
        twiml.message('Información incorrecta.');
      } else {
        const doc = partSnap.docs[0].data();
        console.log('✅ Encontrado por Part:', doc);
        twiml.message(formatearRespuesta(doc));
      }
    } else {
      const doc = snapshot.docs[0].data();
      console.log('✅ Encontrado por KANBAN:', doc);
      twiml.message(formatearRespuesta(doc));
    }

  } catch (error) {
    console.error('❌ Error al consultar Firestore:', error);
    twiml.message('Hubo un error al buscar el material. Intenta más tarde.');
  }

  res.type('text/xml').send(twiml.toString());
});

function formatearRespuesta(row) {
  return (
    `📦 *Resultado:*\n\n` +
    `🔹 *KANBAN:* ${row.KANBAN}\n` +
    `🔹 *Parte:* ${row.Part}\n` +
    `🔹 *Proveedor:* ${row.Supplier}\n` +
    `🔹 *Nombre Proveedor:* ${row.SupplierName}\n` +
    `🔹 *Nombre Parte:* ${row.PartName}\n` +
    `🔹 *DOCK:* ${row.DOCK}\n` +
    `🔹 *Analista:* ${row.Analyst}\n` +
    `🔹 *SubRuta:* ${row.SubRoute}\n` +
    `🔹 *Ruta Principal:* ${row.MainRoute}\n` +
    `🔹 *Uso:* ${row.Usage}`
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});