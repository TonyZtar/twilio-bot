const express = require('express');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/webhook', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message('Hola! Tu bot está funcionando');
  res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});