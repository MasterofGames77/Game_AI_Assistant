# Video Game Wingman

**Your AI-powered gaming companion for Discord and web**

Video Game Wingman is an intelligent AI assistant designed specifically for gamers. Whether you're stuck on a difficult level, looking for game recommendations, or want to discuss gaming strategies with fellow players, Video Game Wingman is your go-to companion.

## 🎮 What is Video Game Wingman?

Video Game Wingman is more than just an AI - it's a gamer who lives and breathes video games, always ready to discuss strategies, secrets, and stories. Think of it as your enthusiastic co-op partner in your gaming journey.

### Key Features

- **AI-Powered Gaming Assistant**: Get personalized help with walkthroughs, game recommendations, and strategies
- **Discord Bot Integration**: Add Video Game Wingman to your Discord server for real-time gaming discussions
- **Community Forums**: Join Pro-only forums to discuss games, share tips, and connect with other gamers
- **Real-time Notifications**: Get instant updates about achievements, forum responses, and community activity
- **Advanced Analytics**: Track your gaming progress and get personalized insights
- **Multi-Platform Support**: Access via web interface or Discord

### What Video Game Wingman Can Help With

- 🎯 **Game Walkthroughs**: Step-by-step guidance for any game
- 🎮 **Game Recommendations**: Personalized suggestions based on your preferences
- 🔍 **Hidden Secrets**: Discover easter eggs and hidden content
- 💡 **Tips & Tricks**: Pro strategies to improve your gameplay
- 📚 **Game Lore**: Deep dives into game stories and backstories
- 📊 **Gaming Analytics**: Track your progress and achievements
- 🏆 **Achievement Help**: Guidance on unlocking specific achievements
- 🎪 **Game News**: Stay updated with the latest gaming industry news

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- MongoDB database
- Discord Application (for bot features)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ai_assistant_nextjs
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Discord Bot Setup

1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Add the bot to your server using the invite link
3. Configure the bot with your Discord Application ID

## 🏗️ Architecture

- **Frontend**: Next.js 14 with React 18
- **Backend**: Next.js API routes
- **Database**: MongoDB with Mongoose
- **Authentication**: Custom auth system with Discord OAuth
- **AI Integration**: OpenAI GPT models
- **Real-time Features**: Socket.IO for live updates
- **Payment Processing**: Stripe for Pro subscriptions

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main chat interface
│   ├── forum/             # Forum pages
│   ├── account/           # User account management
│   └── upgrade/           # Pro subscription page
├── components/            # React components
│   ├── ForumList.tsx      # Forum listing component
│   ├── CreateForum.tsx    # Forum creation component
│   └── Sidebar.tsx        # Navigation sidebar
├── pages/api/             # API endpoints
│   ├── assistant.ts       # AI chat endpoint
│   ├── discord/           # Discord integration
│   └── forum/             # Forum management
├── utils/                 # Utility functions
│   ├── discordBot.ts      # Discord bot logic
│   ├── aiHelper.ts        # AI integration
│   └── proAccessUtil.ts   # Pro feature access
└── models/                # Database models
    ├── User.ts            # User schema
    ├── Forum.ts           # Forum schema
    └── Question.ts        # Chat history schema
```

## 🎯 Pro Features

Upgrade to Video Game Wingman Pro to unlock:

- **Unlimited Questions**: No rate limits on AI interactions
- **Forum Access**: Create and participate in exclusive gaming forums
- **Real-time Notifications**: Instant updates on achievements and forum activity
- **Advanced Analytics**: Detailed gaming progress tracking
- **Priority Support**: Faster response times for assistance
- **Private Forums**: Create invite-only discussion groups

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details on how to:

- Report bugs
- Suggest new features
- Submit pull requests
- Set up the development environment

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Discord**: Join our Discord server for community support
- **GitHub Issues**: Report bugs and request features on our GitHub repository
- **Email**: Contact the developer directly

## 🔗 Links

- **Website**: [https://assistant.videogamewingman.com](https://assistant.videogamewingman.com)
- **Discord Bot**: Add to your server
- **GitHub Repository**: [View source code and contribute](https://github.com/your-org/video-game-wingman)

---

_Ready to level up your gaming experience? Let Video Game Wingman be your guide!_ 🎮✨
