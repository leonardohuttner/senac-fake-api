import cors from 'cors';
import express from 'express';
import nfeRoutes from './routes/nfeRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sefaz-senac-backend' });
});

app.use('/nfe', nfeRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

export default app;
