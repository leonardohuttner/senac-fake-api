import { Router } from 'express';
import nfeController from '../controllers/nfeController.js';

const router = Router();

router.post('/receber', nfeController.receber);
router.post('/autorizar/:id', nfeController.autorizar);
router.get('/', nfeController.listar);
router.put('/:id', nfeController.editar);
router.post('/validar-xml', nfeController.validarXml);

export default router;
