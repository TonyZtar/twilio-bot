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

  if (msg && msg.toLowerCase() === 'hola') {
    console.log('📤 Enviando mensaje de bienvenida');
    twiml.message('Welcome. Please enter a Kanban or Part Number.');
    return res.type('text/xml').send(twiml.toString());
  }

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
        twiml.message('Incorrect information.');
        return res.type('text/xml').send(twiml.toString());
      } else {
        const doc = partSnap.docs[0].data();
        const mensaje = formatearRespuesta(doc);
        console.log('📤 Respuesta enviada:', mensaje);
        twiml.message(mensaje);
        return res.type('text/xml').send(twiml.toString());
      }
    } else {
      const doc = snapshot.docs[0].data();
      const mensaje = formatearRespuesta(doc);
      console.log('📤 Respuesta enviada:', mensaje);
      twiml.message(mensaje);
      return res.type('text/xml').send(twiml.toString());
    }

  } catch (error) {
    console.error('❌ Error al consultar Firestore:', error);
    twiml.message('An error occurred while retrieving the material. Please try again later.');
    return res.type('text/xml').send(twiml.toString());
  }
});

function formatearRespuesta(row) {
  return (
    "*RESULT:*

" +
    "*KANBAN:* _" + row.KANBAN + "_
" +
    "*Part:* _" + row.Part + "_
" +
    "*Supplier:* _" + row.Supplier + "_
" +
    "*Supplier Name:* _" + row.SupplierName + "_
" +
    "*Part Name:* _" + row.PartName + "_
" +
    "*DOCK:* _" + row.DOCK + "_
" +
    "*Analyst:* _" + row.Analyst + "_
" +
    "*SubRoute:* _" + row.SubRoute + "_
" +
    "*Main Route:* _" + row.MainRoute + "_
" +
    "*Usage:* _" + row.Usage + "_"
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});