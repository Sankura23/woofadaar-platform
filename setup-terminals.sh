#!/bin/bash

# Woofadaar Multi-Terminal Setup Script

echo "🚀 Setting up Woofadaar Development Terminals"
echo "============================================"

# Terminal 1 - Feature Development
osascript -e 'tell app "Terminal" to do script "cd /Users/sanket/Desktop/woofadaar1/mobile && echo \"📱 T1: FEATURE DEVELOPMENT\" && echo \"Ready for new features!\" && npx expo start"'

# Terminal 2 - Bug Fixes & Integration
osascript -e 'tell app "Terminal" to do script "cd /Users/sanket/Desktop/woofadaar1 && echo \"🔧 T2: BUG FIXES & INTEGRATION\" && echo \"Backend server starting...\" && npm run dev"'

# Terminal 3 - Testing & Optimization
osascript -e 'tell app "Terminal" to do script "cd /Users/sanket/Desktop/woofadaar1 && echo \"🧪 T3: TESTING & OPTIMIZATION\" && echo \"Ready for testing!\""'

# Terminal 4 - DevOps & Infrastructure
osascript -e 'tell app "Terminal" to do script "cd /Users/sanket/Desktop/woofadaar1 && echo \"🛠️ T4: DEVOPS & INFRASTRUCTURE\" && echo \"Database and deployment ready!\" && npx prisma studio"'

echo "✅ All terminals configured!"
echo "Happy coding! 🎉"