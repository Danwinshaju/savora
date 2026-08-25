import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const port = Number(process.env.PORT || 5000);
app.use(express.json({ limit: '100kb' }));

function catalogue() {
  return ['sweets', 'snacks', 'pickles', 'masala', 'rice'].flatMap(category => {
    const html = fs.readFileSync(path.join(root, `${category}.html`), 'utf8');
    return [...html.matchAll(/<div class="card">([\s\S]*?)<\/div>\s*<\/div>/g)].map((match, index) => {
      const body = match[1];
      const name = body.match(/<h3>(.*?)<\/h3>/s)?.[1]?.trim();
      const image = body.match(/<img src="([^"]+)"/s)?.[1]?.replace(/^\.\//, '/');
      const price = Number(body.match(/class="price">\s*₹([0-9]+)/s)?.[1]);
      return name && image && price ? { id: `${category}-${index + 1}`, name, category, price, image, weight: '250 g', rating: 4.8, description: `Fresh ${name} prepared with carefully selected ingredients and authentic traditional flavour.` } : null;
    }).filter(Boolean);
  });
}

const products = catalogue().concat([
  { id: 'featured-sweet-box', name: 'Sweet Box', category: 'sweets', price: 250, image: '/assets/image/sweets/1.avif', weight: '500 g', rating: 4.8, description: 'A fresh selection of traditional Indian sweets.' },
  { id: 'featured-healthy-snacks', name: 'Healthy Snacks', category: 'snacks', price: 180, image: '/assets/image/snacks/2.avif', weight: '250 g', rating: 4.8, description: 'A wholesome snack selection prepared fresh.' },
  { id: 'featured-pickles', name: 'Pickles', category: 'pickles', price: 220, image: '/assets/image/pickles/4.jpg', weight: '250 g', rating: 4.8, description: 'Traditional pickles with rich homemade flavour.' },
  { id: 'featured-masala-podi', name: 'Masala Podi', category: 'masala', price: 150, image: '/assets/image/masala/2.avif', weight: '250 g', rating: 4.8, description: 'An aromatic traditional masala podi blend.' }
]);
const memoryOrders = [];
let databaseReady = false;
const orderSchema = new mongoose.Schema({ customer: Object, items: Array, total: Number, status: { type: String, default: 'received' } }, { timestamps: true });
const contactSchema = new mongoose.Schema({ name: String, email: String, subject: String, message: String }, { timestamps: true });
const newsletterSchema = new mongoose.Schema({ email: { type: String, unique: true } }, { timestamps: true });
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);

if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => { databaseReady = true; }).catch(error => console.error('MongoDB unavailable; using temporary storage:', error.message));

app.get('/api/health', (_req, res) => res.json({ ok: true, database: databaseReady ? 'mongodb' : 'temporary' }));
app.get('/api/products', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const category = String(req.query.category || '').toLowerCase();
  res.json(products.filter(product => (!q || `${product.name} ${product.category}`.toLowerCase().includes(q)) && (!category || product.category === category)));
});
app.get('/api/products/:id', (req, res) => {
  const product = products.find(item => item.id === req.params.id);
  product ? res.json(product) : res.status(404).json({ message: 'Product not found.' });
});
app.post('/api/orders', async (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer?.name || !customer?.email || !Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Customer details and cart items are required.' });
  const safeItems = items.map(item => ({ product: products.find(p => p.id === item.id), quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)) })).filter(item => item.product);
  if (!safeItems.length) return res.status(400).json({ message: 'The order has no valid products.' });
  const total = safeItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const payload = { customer, items: safeItems.map(item => ({ id: item.product.id, name: item.product.name, price: item.product.price, quantity: item.quantity })), total };
  const order = databaseReady ? await Order.create(payload) : { ...payload, _id: `SAV-${Date.now()}` };
  if (!databaseReady) memoryOrders.push(order);
  res.status(201).json({ message: 'Your order has been placed.', orderId: order._id, total });
});
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || !message) return res.status(400).json({ message: 'Name, valid email and message are required.' });
  if (databaseReady) await Contact.create(req.body);
  res.status(201).json({ message: 'Thank you. We will get back to you soon.' });
});
app.post('/api/newsletter', async (req, res) => {
  const email = String(req.body?.email || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (databaseReady) await Newsletter.updateOne({ email }, { email }, { upsert: true });
  res.status(201).json({ message: 'You are subscribed to SAVORA updates.' });
});

app.use((req, res, next) => /^\/(node_modules|server|package(?:-lock)?\.json|\.env)/.test(req.path) ? res.sendStatus(404) : next());
app.use(express.static(root, { extensions: ['html'] }));
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  app.listen(port, () => console.log(`SAVORA running at http://localhost:${port}`));
}

export { app, products };
