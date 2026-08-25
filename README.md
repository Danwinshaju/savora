# SAVORA

A full-stack storefront built around SAVORA's original visual design. The existing pages and styles are preserved, with product search, details, account state, persistent cart, checkout, order creation, contact submissions and newsletter subscriptions added.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:5000`.

## Database

Copy `.env.example` to `.env` and set `MONGODB_URI` to a MongoDB Atlas connection string. Without it, SAVORA runs with temporary order storage so the complete storefront can still be tested locally.

## API

- `GET /api/health`
- `GET /api/products?q=&category=`
- `GET /api/products/:id`
- `POST /api/orders`
- `POST /api/contact`
- `POST /api/newsletter`

## Deploy

`render.yaml` contains a Render blueprint. Add `MONGODB_URI` in the Render service environment for persistent orders and enquiries. The static storefront remains compatible with GitHub Pages; cart and checkout use browser storage there.
