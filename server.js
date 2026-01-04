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

// SEO Service Packages
const packages = {
  starter: {
    name: 'Starter',
    price: 2990,
    priceId: 'price_starter', // Replace with actual Stripe Price ID
    description: 'Basic SEO audit with detailed report',
    features: [
      'Complete website audit',
      'Keyword analysis',
      'Competitor overview',
      'PDF report delivery'
    ]
  },
  growth: {
    name: 'Growth',
    price: 5990,
    priceId: 'price_growth', // Replace with actual Stripe Price ID
    description: 'Full audit with 3 months of support',
    features: [
      'Everything in Starter',
      'On-page optimization',
      'Technical SEO fixes',
      '3 months email support',
      'Monthly progress reports'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 14990,
    priceId: 'price_enterprise', // Replace with actual Stripe Price ID
    description: 'Complete SEO overhaul with 6 months support',
    features: [
      'Everything in Growth',
      'Content strategy',
      'Link building campaign',
      'Local SEO optimization',
      '6 months dedicated support',
      'Weekly strategy calls'
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
              name: `SEO ${selectedPackage.name} Package`,
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
