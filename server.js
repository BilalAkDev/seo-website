require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook endpoint needs raw body - must be before other middleware
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      // Get customer details
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name;
      const amountPaid = session.amount_total / 100; // Convert from öre to SEK
      const paymentStatus = session.payment_status;

      console.log('=================================');
      console.log('💰 NY BETALNING MOTTAGEN!');
      console.log('=================================');
      console.log(`Kund: ${customerName || 'Ej angivet'}`);
      console.log(`Email: ${customerEmail || 'Ej angivet'}`);
      console.log(`Belopp: ${amountPaid} SEK`);
      console.log(`Status: ${paymentStatus}`);
      console.log(`Session ID: ${session.id}`);
      console.log(`Tid: ${new Date().toLocaleString('sv-SE')}`);
      console.log('=================================');

      // TODO: Här kan du lägga till:
      // - Skicka bekräftelsemail till kunden
      // - Skicka SMS till dig själv
      // - Spara i databas
      // - Uppdatera Google Sheets

      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Betalning misslyckades:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Regular middleware for other routes
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DriveX Car Rental Packages
const packages = {
  test: {
    name: 'Testpaket',
    duration: 'Test',
    price: 5,
    description: 'Testbetalning - 5 kr',
    features: [
      'Testar betalningssystemet'
    ]
  },
  daily: {
    name: 'Dagspaket',
    duration: '24 timmar',
    price: 1990,
    description: 'Perfekt för en dag av lyx och äventyr',
    features: [
      '24 timmars hyra',
      '200 km inkluderat',
      'Fullständig försäkring',
      'Vägassistans 24/7',
      'Flexibel avbokning'
    ]
  },
  weekend: {
    name: 'Helgpaket',
    duration: 'Fre-Sön',
    price: 4990,
    description: 'Tre dagar av frihet på vägen',
    features: [
      'Fredag till söndag',
      '600 km inkluderat',
      'Fullständig försäkring',
      'Vägassistans 24/7',
      'Dörrleverans ingår',
      'Gratis extra förare'
    ]
  },
  weekly: {
    name: 'Veckpaket',
    duration: '7 dagar',
    price: 9990,
    description: 'En hel vecka av obegränsade möjligheter',
    features: [
      '7 dagars hyra',
      'Obegränsade mil',
      'Fullständig försäkring',
      'Vägassistans 24/7',
      'Dörrleverans ingår',
      'Gratis extra förare',
      'Personlig concierge'
    ]
  }
};

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    packages,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

app.get('/success', (req, res) => {
  res.render('success');
});

app.get('/cancel', (req, res) => {
  res.render('cancel');
});

// Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { packageType } = req.body;
  const selectedPackage = packages[packageType];

  if (!selectedPackage) {
    return res.status(400).json({ error: 'Invalid package selected' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      // Stripe auto-detects best payment methods (Card, Apple Pay, Google Pay, Klarna, PayPal, etc.)
      // Enable these in Stripe Dashboard > Settings > Payment Methods
      payment_method_types: ['card', 'klarna', 'paypal'],
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: `DriveX ${selectedPackage.name}`,
              description: selectedPackage.description,
            },
            unit_amount: selectedPackage.price * 100, // Stripe uses cents/öre
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
