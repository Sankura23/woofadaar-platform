# Woofadaar iPhone App - Network Connection Debug Log

## Issue Summary
- iPhone app shows "No script URL provided" error after WiFi network change
- App worked perfectly before changing WiFi networks
- Same error persists even after clean builds and reinstalls via Xcode

## Current Network Configuration
```bash
$ ifconfig | grep "inet " | grep -v 127.0.0.1
	inet 192.168.31.101 netmask 0xffffff00 broadcast 192.168.31.255
```
- Current WiFi IP: 192.168.31.101
- Previous WiFi IP: 192.168.1.7 (from logs showing backend requests)

## App Configuration
### Current app.json:
```json
{
  "expo": {
    "name": "Woofadaar",
    "slug": "woofadaar",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/woofadaar-icon.jpg",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/woofadaar-logo.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.woofadaar.app",
      "buildNumber": "3",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to take photos of your dog.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photo library to select dog photos.",
        "NSLocationWhenInUseUsageDescription": "This app uses location to find nearby veterinarians and services.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "updates": {
      "enabled": false
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "scheme": "woofadaar",
    "plugins": []
  }
}
```

## Error Details
### iPhone Error Screen Shows:
- "No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle."
- `unsanitizedScriptURLString = (null)`

### Metro Bundler Status:
- Metro server attempts to start on localhost:8081
- Server accessible on current network (192.168.31.101:8081)
- App successfully connects when network IPs match

## Previous Working Logs
App was working and making successful API calls:
```
LOG  Making request to: http://192.168.1.7:3000/api/auth/login
LOG  Response status: 200
LOG  Response body: {"message":"Login successful",...}
```

## Build History
1. **Initial working state**: App built on 192.168.1.7 network
2. **Network change**: Switched to 192.168.31.101 network
3. **Problem started**: "No script URL provided" errors
4. **Attempted fixes**:
   - Clean build folder in Xcode
   - Complete app deletion and reinstall
   - Metro server restart with --clear flag
   - Modified app.json configuration
   - Tried both Debug and Release builds

## Technical Analysis
**Root Cause**: Expo Development Client embeds Metro server URL during build time. When WiFi network changes, the hardcoded IP becomes invalid but app continues looking for old IP address.

**Evidence**:
- App worked perfectly on previous network (192.168.1.7)
- Identical error occurs on new network (192.168.31.101)
- Metro server runs successfully but app can't connect
- Issue is network-specific, not code-specific

## Environment Details
- **Platform**: macOS Darwin 25.0.0
- **Xcode**: Latest version with iPhone device connected
- **Expo**: Development client build
- **React Native**: Latest version
- **Network**: Home WiFi with different IP range than previous

## Expo Package Versions
```
expo@54.0.12 - expected version: 54.0.13
expo-router@6.0.10 - expected version: ~6.0.12
```

## Request for Solution
Need solution to resolve Expo Development Client network dependency issue without requiring WiFi network rollback.

Generated: 2025-10-13 12:00:00
Device: Sanket's iPhone
Network: 192.168.31.101