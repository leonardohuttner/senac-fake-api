import { Router } from 'express';
import nfeController from '../controllers/nfeController.js';

const router = Router();

router.post('/receber', nfeController.receber);
router.post('/autorizar/:chaveAcesso', nfeController.autorizar);
router.post('/cancelar/:chaveAcesso', nfeController.cancelar);
router.get('/', nfeController.listar);
router.put('/:id', nfeController.editar);
router.post('/validar-xml', nfeController.validarXml);

router.post('/json/receber', nfeController.receberJson);
router.post('/json/autorizar/:chaveAcesso', nfeController.autorizarJson);
router.post('/json/cancelar/:chaveAcesso', nfeController.cancelarJson);
router.get('/json', nfeController.listarJson);
router.put('/json/:id', nfeController.editarJson);
router.post('/json/validar-xml', nfeController.validarXmlJson);

export default router;
