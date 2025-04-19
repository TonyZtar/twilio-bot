const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');
const db = require('./firebase');

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: false }));

// 🧠 Control de sesiones por número con timestamps
const sesiones = new Map(); // { numero: timestamp }

app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  let msg = req.body.Body?.trim();
  const numero = req.body.From;

  console.log(`📥 Mensaje recibido de ${numero}: "${msg}"`);

  // 🔠 Convertir entrada a MAYÚSCULAS
  msg = msg.toUpperCase();

  // 🕓 Verificar si es un nuevo usuario o han pasado más de 24 horas
  const ahora = Date.now();
  const ultimaVez = sesiones.get(numero);
  const hanPasado24h = !ultimaVez || (ahora - ultimaVez) > 24 * 60 * 60 * 1000;

  if (hanPasado24h) {
    sesiones.set(numero, ahora);
    console.log('👋 Enviando mensaje de bienvenida');
    twiml.message(
      'Welcome. Please enter a Kanban (4 characters) or Part Number (12 digits, no dashes).'
    );
    return res.type('text/xml').send(twiml.toString());
  } else if (msg === 'HOLA' || msg === 'HELLO') {
    // 🟢 Usuario activo saludando de nuevo
    twiml.message('Enter Kanban or Part Number.');
    return res.type('text/xml').send(twiml.toString());
  }

  // 🔍 Buscar por KANBAN
  try {
    console.log('🔍 Buscando por KANBAN...');
    const snapshot = await db.collection('materiales').where('KANBAN', '==', msg).get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0].data();
      console.log('✅ Encontrado por KANBAN:', doc);
      const respuesta = formatearRespuesta(doc);
      console.log('📤 Respuesta enviada:', respuesta);
      twiml.message(respuesta);
    } else {
      // 🔄 Buscar por Part Number
      console.log('🔍 No encontrado por KANBAN. Buscando por Part...');
      const partSnap = await db.collection('materiales').where('Part', '==', msg).get();

      if (!partSnap.empty) {
        const doc = partSnap.docs[0].data();
        console.log('✅ Encontrado por Part:', doc);
        const respuesta = formatearRespuesta(doc);
        console.log('📤 Respuesta enviada:', respuesta);
        twiml.message(respuesta);
      } else {
        console.log('⚠️ Información no encontrada');
        twiml.message('Incorrect information.');
      }
    }
  } catch (error) {
    console.error('❌ Error al consultar Firestore:', error);
    twiml.message('There was an error retrieving the information. Please try again later.');
  }

  res.type('text/xml').send(twiml.toString());
});

// 🧾 Formatear respuesta con negritas y cursiva
function formatearRespuesta(row) {
  return (
    "*RESULT:*\n\n" +
    "*KANBAN:* _" + row.KANBAN + "_\n" +
    "*Part:* _" + row.Part + "_\n" +
    "*Supplier:* _" + row.Supplier + "_\n" +
    "*Supplier Name:* _" + row.SupplierName + "_\n" +
    "*Part Name:* _" + row.PartName + "_\n" +
    "*DOCK:* _" + row.DOCK + "_\n" +
    "*Analyst:* _" + row.Analyst + "_\n" +
    "*SubRoute:* _" + row.SubRoute + "_\n" +
    "*Main Route:* _" + row.MainRoute + "_\n" +
    "*Usage:* _" + row.Usage + "_"
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});
