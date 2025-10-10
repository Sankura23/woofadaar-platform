#!/bin/bash

# Open Terminal tabs with Claude Code for Woofadaar development

echo "🚀 Opening Claude Code terminals for Woofadaar..."

# Tab 1 - Feature Development
osascript <<EOF
tell application "Terminal"
    activate
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "echo -n -e '\\033]0;T1-Features\\007' && echo '🏗️ T1: FEATURE DEVELOPMENT' && echo 'Start Claude with: claude' && echo 'Then tell Claude: This is T1 for FEATURE DEVELOPMENT'" in selected tab of the front window
end tell
EOF

# Tab 2 - Bug Fixes
osascript <<EOF
tell application "Terminal"
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "echo -n -e '\\033]0;T2-Bugs\\007' && echo '🔧 T2: BUG FIXES' && echo 'Start Claude with: claude' && echo 'Then tell Claude: This is T2 for BUG FIXES'" in selected tab of the front window
end tell
EOF

# Tab 3 - Testing
osascript <<EOF
tell application "Terminal"
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "echo -n -e '\\033]0;T3-Testing\\007' && echo '🧪 T3: TESTING' && echo 'Start Claude with: claude' && echo 'Then tell Claude: This is T3 for TESTING'" in selected tab of the front window
end tell
EOF

# Tab 4 - DevOps
osascript <<EOF
tell application "Terminal"
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "echo -n -e '\\033]0;T4-DevOps\\007' && echo '🛠️ T4: DEVOPS' && echo 'Start Claude with: claude' && echo 'Then tell Claude: This is T4 for DEVOPS'" in selected tab of the front window
end tell
EOF

echo "✅ All tabs created! Now just type 'claude' in each tab."