# Fragrance Wardrobe

A full-stack web application for managing your personal fragrance collection with AI-powered recommendations and discovery.

## Overview

Fragrance Wardrobe is your personal fragrance advisor and collection manager. Catalog your scent journey, discover new fragrances tailored to your preferences, and receive AI-powered recommendations from our intelligent advisor powered by Google's Gemini API.

## Features

### Core Functionality
- **User Authentication**: Secure sign-up and login system with bcrypt password hashing
- **Personal Collection**: Build and manage your fragrance collection with filtering and sorting
- **AI Advisor**: Thread-based conversational chat with an 'intelligent' fragrance advisor
- **Fragrance Discovery**: Browse and search through a comprehensive fragrance database, imported from the Kaggle dataset: https://www.kaggle.com/datasets/olgagmiufana1/fragrantica-com-fragrance-dataset
- **Smart Search**: Live search with dropdown suggestions and duplicate detection
- **Direct Add**: Add fragrances from the collection page's library search directly to your wardrobe

### Advanced Features
- **Conversation Management**: Create, manage, and delete separate chat conversations
- **Draft Conversations**: New chats only appear in history after first user message
- **Strict Formatting**: AI recommendations in standardized format: `'Brand' - 'Perfume Name'`
- **Responsive Design**: Beautiful luxury-themed UI that adapts to all screen sizes


## Tech Stack

### Frontend
- **React 18** - UI framework with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Axios** - HTTP client for API calls
- **React Router** - Client-side routing
The frontend will be available at `http://localhost:5173`


### Backend
- **Node.js & Express** - Server runtime and web framework
- **PostgreSQL** - Relational database
- **Google Generative AI SDK** - Gemini API integration
- **bcrypt** - Password hashing and authentication
- **pg** - PostgreSQL client for Node.js
The backend will run on `http://localhost:5000`

## Installation

### Prerequisites
- **Node.js** 14+ and npm
- **PostgreSQL** 12+
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com))

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env` file):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fragrance_wardrobe
DB_USER=your_db_user
DB_PASSWORD=your_db_password
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

4. Initialize the database:
```bash
npm run seed
```

5. Start the backend server:
```bash
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Project Structure

```
fragranceWardrobe/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── aiController.js
│   │   └── authController.js
│   │   └── perfumeController.js
│   │   └── userController.js
│   │   └── wardrobeController.js
│   ├── routes/
│   │   └── ai.js
│   │   └── auth.js
│   │   └── collection.js
│   │   └── perfumes.js
│   │   └── users.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── hero-perfume.jpg
│   │   │   ├── motif.jpg
│   │   ├── pages/
│   │   │   ├── Advisor.jsx          # AI chat advisor
│   │   │   ├── Auth.jsx             # Login/Register
│   │   │   ├── CollectionPage.jsx   # Authenticated user's collection
│   │   │   ├── DiscoverPage.jsx     # Page for discovering perfumes
│   │   │   ├── EditProfilePage.jsx
│   │   │   ├── LandingPage.jsx      # Home page
│   │   │   └── PerfumeDetails.jsx   # Page with a single perfume's details
│   │   ├── services/
│   │   │   └── api.js                 # API client
│   │   ├── utils/
│   │   │   └── formatPerfumeName.js
│   │   ├── App.jsx                    # Main app component
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── fra_cleaned.csv              # Fragrance dataset
└── README.md
```

## Usage

### Getting Started
1. Visit the landing page and click "Join the Atelier" to create an account
2. Explore fragrances in the Discover section
3. Add fragrances to your personal collection
4. Chat with the AI Advisor for personalized recommendations
5. Manage your collection with advanced filtering and sorting

### The Advisor
- Start a new conversation from the Advisor page
- Ask about fragrance recommendations for specific occasions or preferences
- Ask questions regarding specific scents
- Delete conversations you no longer need
- Each conversation maintains its own message history
- The Advisor also provides additional information on each perfume when you press "View Details"

### Collection Management
- Use the library search bar to quickly find and add fragrances
- Filter by scent profile, brand, or notes
- Sort your collection by various criteria
- View detailed fragrance information in separate pages


## API Endpoints - CRUD Operations

### Authentication
- `POST /api/auth/register` - Create a new account
- `POST /api/auth/login` - Log in to account

### Fragrances
- `GET /api/perfumes` - Get all fragrances
- `GET /api/perfumes/search?q=query` - Search fragrances

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile (username, olfactive preference, budget preference, signature notes)

### Collection
- `GET /api/collection/:userId` - Get user's collection
- `POST /api/collection` - Add fragrance to collection
- `DELETE /api/collection/:userId/:perfumeId` - Remove from collection

### AI Advisor
- `POST /api/ai/chat` - Send message to advisor
- `GET /api/ai/history/:userId` - Get conversation history
- `DELETE /api/ai/history/:userId/:conversationId` - Delete a conversation


## LLMs and Tools used in Developing Process

- **Visual Studio Code** - Code editor
- **GitHub Copilot** (Claude Sonnet 4.6) - AI pair programmer used throughout development for code generation, debugging, and refactoring
- **Google AI Studio** - Used to obtain and test the Gemini API key


## Technical Challenges

### Gemini API Quota Limit Exceeded and Model Fallbacks

While integrating the AI advisor and perfume suggestion features, Gemini requests would sometimes fail even though the API key and request structure were valid. The issue was that some configured Gemini models were unavailable for the current key or had exceeded their request quota limit, which caused the app to return a `"model not found/available"` style error.

This made the failure misleading at first, because the problem was not the API integration itself, but the availability of a specific model at runtime. Some models returned quota-related or availability-related errors, while others remained usable.

**Solution:** Instead of relying on a single Gemini model, the backend was updated to try a list of fallback models in sequence. If the preferred model (e.g. `"gemini-2.5-flash"`) failed due to quota or availability, the app automatically retried with spare supported models (e.g. `"gemini-2.0-flash", "gemini-1.5-latest", etc.`) before returning an error to the user. This made the AI features significantly more resilient and reduced unnecessary failures when one model temporarily became unavailable.


### Prompt Engineering Fix: Inconsistent Recommendation Output

Early AI responses were difficult to parse because recommendations were returned in inconsistent styles (extra commentary, mixed separators, or missing brand/perfume structure). This caused unstable UI behavior for suggestion rendering and follow-up matching against the perfume catalog.

**Prompt engineering solution adopted:**
- Added explicit output rules requiring a strict recommendation format: `'Brand' - 'Perfume Name'`.
- Added negative constraints (no markdown, no extra prose, no invented fields outside the requested schema).
- Added concise task framing with fragrance context so the model stayed on-domain and reduced drift.

**Result:** AI responses became significantly more structured and predictable, which improved parsing reliability and reduced formatting-related suggestion errors.

---

**Enjoy your fragrance wardrobe!**
