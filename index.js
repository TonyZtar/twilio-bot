const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: false }));

// Conexión a Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Para llevar control de números nuevos (solo en memoria, opcional para producción usar Supabase)
const usuariosSaludados = new Set();

app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const msg = req.body.Body?.trim();
  const numero = req.body.From; // Formato: whatsapp:+52166xxxxxx

  // 1️⃣ Bienvenida inicial solo una vez por usuario
  if (!usuariosSaludados.has(numero)) {
    usuariosSaludados.add(numero);
    twiml.message('👋 Bienvenido.\n\nIngrese Kanban o Número de parte.');
    return res.type('text/xml').send(twiml.toString());
  }

  // 2️⃣ Validar mensaje vacío
  if (!msg) {
    twiml.message('Por favor, ingrese un Kanban o número de parte.');
    return res.type('text/xml').send(twiml.toString());
  }

  // 3️⃣ Buscar primero por KANBAN
  let { data, error } = await supabase
    .from('DivisionP04')
    .select('*')
    .eq('KANBAN', msg);

  // 4️⃣ Si no encontró por KANBAN, buscar por número de parte
  if (!data || data.length === 0) {
    const result = await supabase
      .from('DivisionP04')
      .select('*')
      .eq('Part', msg);

    data = result.data;
    error = result.error;
  }

  // 5️⃣ Respuesta según resultados
  if (error) {
    console.error('❌ Error al consultar Supabase:', error);
    twiml.message('Hubo un error al buscar el material. Intenta más tarde.');
  } else if (data.length === 0) {
    twiml.message('Información incorrecta.');
  } else {
    const row = data[0];
    twiml.message(
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

  res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});

// Última modificación: corrección tabla DivisionP04
