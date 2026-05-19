import express from 'express';
import { createContact, getAllContacts, getSingleContact, deleteContact } from '../controllers/contactController.js';
import verifyToken, { verifyAdmin } from '../utils/verifyToken.js';
import { z } from 'zod';
import { validateBody } from '../utils/validate.js';
import { publicWriteLimiter } from '../utils/rateLimiters.js';
import { validateObjectId } from '../utils/validateObjectId.js';

const contactRoute = express.Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(30),
  message: z.string().min(1).max(4000),
});

contactRoute.post('/', publicWriteLimiter, validateBody(contactSchema), createContact);

contactRoute.get('/:id', verifyToken, verifyAdmin, validateObjectId('id'), getSingleContact);

contactRoute.get('/', verifyToken, verifyAdmin, getAllContacts);

contactRoute.delete('/:id', verifyToken, verifyAdmin, validateObjectId('id'), deleteContact);

export default contactRoute;
