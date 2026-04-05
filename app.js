// ============================================================
// 📁 app.js — Main Server File
// This is the brain of our website. It handles:
//   1. Setting up the Express server
//   2. Making API calls to Blockchain.com using Axios
//   3. Sending data to our HTML template (index.ejs)
// ============================================================

// ---------- Step 1: Import Required Packages ----------

const express = require("express");       // Express = framework to build web servers
const axios = require("axios");           // Axios = tool to make HTTP requests to APIs
const bodyParser = require("body-parser"); // Body-parser = reads form data sent by the user

// ---------- Step 2: Create the App & Set Config ----------

const app = express();                    // Create our Express application
const port = 3000;                        // Our server will run on port 3000

// Tell Express where to find static files (CSS, images, etc.)
app.use(express.static("public"));

// Tell Express to read form data when user submits a form
app.use(bodyParser.urlencoded({ extended: true }));

// Tell Express to use EJS as the template engine
// EJS lets us mix JavaScript with HTML to show dynamic data
app.set("view engine", "ejs");

// ---------- Step 3: The Base API URL ----------
// This is the Blockchain.com public API endpoint for market data
const API_BASE = "https://api.blockchain.com/v3/exchange";

// ---------- Step 4: GET Route — Home Page ----------
// When a user visits the site, this runs first
// It fetches the top trending tickers to show on the home page

app.get("/", async (req, res) => {
  try {
    // Call the API to get ALL available ticker prices
    const response = await axios.get(`${API_BASE}/tickers`);

    // The API returns an array of objects. Each object has:
    //   { symbol, price_24h, volume_24h, last_trade_price }

    // Filter: keep only tickers that trade against USD
    // Example: "BTC-USD" ✅, "BTC-EUR" ❌
    const usdTickers = response.data.filter(
      (ticker) => ticker.symbol.endsWith("-USD")
    );

    // Sort by volume (highest first) and pick the top 5
    const trending = usdTickers
      .sort((a, b) => parseFloat(b.volume_24h) - parseFloat(a.volume_24h))
      .slice(0, 5);

    // Render the home page and pass trending data + no search result yet
    res.render("index", {
      data: null,       // No search result yet (user hasn't searched)
      trending: trending, // Top 5 trending cryptos
      error: null,       // No error
    });

  } catch (error) {
    // If API call fails, show the page with an error message
    console.log("Error fetching trending data:", error.message);
    res.render("index", {
      data: null,
      trending: [],     // Empty array = no trending data available
      error: "Could not load trending data. Please try again later.",
    });
  }
});

// ---------- Step 5: POST Route — When User Searches a Crypto ----------
// This runs when the user selects a crypto and clicks "Check Price"

app.post("/", async (req, res) => {
  try {
    // Get the crypto symbol from the form (e.g., "BTC")
    const symbol = req.body.crypto.toUpperCase();

    // Build the API URL — format is "BTC-USD", "ETH-USD", etc.
    const apiURL = `${API_BASE}/tickers/${symbol}-USD`;

    // Make TWO API calls at the same time using Promise.all:
    //   1. Get the specific ticker the user searched for
    //   2. Get all tickers (for the trending section)
    const [tickerResponse, allResponse] = await Promise.all([
      axios.get(apiURL),
      axios.get(`${API_BASE}/tickers`),
    ]);

    // Extract the searched ticker's data
    const tickerData = tickerResponse.data;

    // Build trending list (same logic as GET route)
    const usdTickers = allResponse.data.filter(
      (ticker) => ticker.symbol.endsWith("-USD")
    );
    const trending = usdTickers
      .sort((a, b) => parseFloat(b.volume_24h) - parseFloat(a.volume_24h))
      .slice(0, 5);

    // Render the page with the search result + trending data
    res.render("index", {
      data: {
        symbol: tickerData.symbol,                   // e.g., "BTC-USD"
        price: tickerData.last_trade_price,           // Current price
        volume: tickerData.volume_24h,                // 24-hour volume
        price24h: tickerData.price_24h,               // Price 24 hours ago
      },
      trending: trending,
      error: null,
    });

  } catch (error) {
    // If the crypto symbol is wrong or API fails, show error
    console.log("Error:", error.message);

    // Still try to load trending data even if search failed
    let trending = [];
    try {
      const allResponse = await axios.get(`${API_BASE}/tickers`);
      const usdTickers = allResponse.data.filter(
        (ticker) => ticker.symbol.endsWith("-USD")
      );
      trending = usdTickers
        .sort((a, b) => parseFloat(b.volume_24h) - parseFloat(a.volume_24h))
        .slice(0, 5);
    } catch (e) {
      // If even trending fails, just leave it empty
    }

    res.render("index", {
      data: null,
      trending: trending,
      error: "❌ Could not find that cryptocurrency. Please try another one!",
    });
  }
});

// ---------- Step 6: Start the Server ----------
// This makes the server "listen" for visitors on port 3000
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});