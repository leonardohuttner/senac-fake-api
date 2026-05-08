import app from './app.js';
import { initializeDatabase } from './config/database.js';

const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Simulador SEFAZ rodando em ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar o banco de dados:', error);
    process.exit(1);
  });
