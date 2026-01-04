require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DriveX Car Rental Packages
const packages = {
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
      payment_method_types: ['card'],
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
