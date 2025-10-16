<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Claude Code iPhone Notification Setup](#claude-code-iphone-notification-setup)
  - [Overview](#overview)
  - [What's In This Guide](#whats-in-this-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Enable Apple Continuity](#step-1-enable-apple-continuity)
    - [On macOS Sequoia 15.7.1](#on-macos-sequoia-1571)
    - [On iOS 26](#on-ios-26)
    - [Verify Continuity Setup](#verify-continuity-setup)
  - [Step 2: Install Terminal Notifier](#step-2-install-terminal-notifier)
  - [Step 3: Configure Claude Code Hooks](#step-3-configure-claude-code-hooks)
    - [Create Settings File](#create-settings-file)
    - [Basic Configuration](#basic-configuration)
    - [Configuration Explanation](#configuration-explanation)
    - [Available Sounds](#available-sounds)
  - [Step 4: Test the Setup](#step-4-test-the-setup)
    - [Test Notifications](#test-notifications)
    - [Expected Behavior](#expected-behavior)
  - [iOS 26-Specific Features](#ios-26-specific-features)
    - [Enhanced Notification Sync](#enhanced-notification-sync)
    - [Managing Notification Delivery](#managing-notification-delivery)
  - [Optional: Enhanced iPhone Push Notifications](#optional-enhanced-iphone-push-notifications)
    - [Why Pushover?](#why-pushover)
    - [Setup Pushover](#setup-pushover)
    - [Pushover Priority Levels](#pushover-priority-levels)
  - [Troubleshooting](#troubleshooting)
    - [Notifications Not Appearing on iPhone](#notifications-not-appearing-on-iphone)
    - [Notifications Not Appearing on Mac](#notifications-not-appearing-on-mac)
    - [Claude Code Hooks Not Firing](#claude-code-hooks-not-firing)
    - [Pushover Issues](#pushover-issues)
  - [Advanced Configuration](#advanced-configuration)
    - [Context-Aware Notifications](#context-aware-notifications)
    - [Custom Notification Sounds](#custom-notification-sounds)
    - [Notification Grouping](#notification-grouping)
    - [Actionable Notifications](#actionable-notifications)
  - [Best Practices](#best-practices)
  - [Additional Resources](#additional-resources)
  - [Changelog](#changelog)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Claude Code iPhone Notification Setup

Complete guide for setting up Claude Code notifications with iOS 26 and macOS Sequoia 15.7.1 continuity.

## Overview

This guide configures Claude Code to send notifications to both your Mac and iPhone whenever:
- Claude finishes a task (Stop event)
- Claude needs your attention/input (Notification event)

With iOS 26's enhanced Continuity features, notifications will automatically sync between devices with the new Liquid Glass design integration.

## What's In This Guide

✅ **Complete Setup Instructions** for iOS 26 + macOS Sequoia 15.7.1:
- Apple Continuity configuration (Handoff, notification sync)
- terminal-notifier installation
- Claude Code hooks configuration in `~/.claude/settings.json`
- Step-by-step testing procedures

✅ **iOS 26-Specific Features**:
- Liquid Glass design integration notes
- Enhanced notification continuity
- Smart device routing
- Cross-device dismissal
- Focus mode integration

✅ **Optional Pushover Setup**:
- For more persistent iPhone push notifications
- Complete script with dual notification support (Mac + iPhone)
- Priority level configuration

✅ **Comprehensive Troubleshooting Section**:
- Handoff verification
- Bluetooth/Wi-Fi checks
- Focus mode configuration
- Notification service restarts

✅ **Advanced Configuration**:
- Context-aware notifications (only when terminal not focused)
- Custom sounds
- Notification grouping
- Actionable notifications with buttons

## Prerequisites

- macOS Sequoia 15.7.1 or later
- iOS 26 or later
- Both devices signed in to same Apple ID
- Bluetooth and Wi-Fi enabled on both devices
- Devices within proximity (for initial pairing)

## Step 1: Enable Apple Continuity

### On macOS Sequoia 15.7.1

1. **Enable Handoff:**
   ```
   System Settings → General → AirDrop & Handoff
   ✓ Allow Handoff between This Mac and your iCloud devices
   ```

2. **Enable iPhone notifications on Mac:**
   ```
   System Settings → Desktop & Dock
   → Select your iPhone under "Show items from iPhone"
   ```

3. **Configure notification settings:**
   ```
   System Settings → Notifications
   ✓ Allow notifications when mirroring or sharing the display
   ✓ Enable notifications for "Terminal" (or your terminal app)
   ```

### On iOS 26

1. **Enable Handoff:**
   ```
   Settings → General → Handoff
   ✓ Enable Handoff
   ```

2. **Configure notification display:**
   ```
   Settings → Notifications
   → Show Previews: "When Unlocked" or "Always" (your preference)
   ```

3. **Verify iCloud connection:**
   ```
   Settings → [Your Name] → iCloud
   ✓ Ensure same Apple ID as Mac
   ```

### Verify Continuity Setup

Both devices must have:
- ✓ Same Apple ID
- ✓ Bluetooth ON
- ✓ Wi-Fi ON
- ✓ Handoff enabled
- ✓ Within proximity (Bluetooth range)

## Step 2: Install Terminal Notifier

Open Terminal on your Mac and run:

```bash
brew install terminal-notifier
```

Test that it works:

```bash
terminal-notifier -title "Test" -message "Hello from Terminal" -sound default
```

This notification should appear on both your Mac and iPhone (if iPhone is locked or nearby).

## Step 3: Configure Claude Code Hooks

### Create Settings File

Create or edit `~/.claude/settings.json`:

```bash
# Create directory if it doesn't exist
mkdir -p ~/.claude

# Edit the settings file
nano ~/.claude/settings.json
```

### Basic Configuration

Add this configuration:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "terminal-notifier -title 'Claude Code' -subtitle 'Task Complete' -message 'Claude has finished working' -sound Glass -group 'claude-code'"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "terminal-notifier -title 'Claude Code' -subtitle 'Needs Attention' -message 'Claude needs your input' -sound Basso -group 'claude-code'"
          }
        ]
      }
    ]
  }
}
```

### Configuration Explanation

- **Stop event**: Triggered when Claude completes a task
  - Sound: "Glass" (pleasant completion sound)
  - Group: "claude-code" (groups notifications together)

- **Notification event**: Triggered when Claude needs input
  - Sound: "Basso" (attention-getting sound)
  - Group: "claude-code" (groups notifications together)

- **Empty matcher**: Applies to all events (no filtering)

### Available Sounds

You can customize the `-sound` parameter with any macOS system sound:
- `Glass` - Completion sound
- `Basso` - Attention sound
- `Blow` - Alert sound
- `Hero` - Success sound
- `Ping` - Short alert
- `Pop` - Quick notification
- `Purr` - Subtle sound
- `Submarine` - Distinctive alert
- `default` - System default sound

## Step 4: Test the Setup

### Test Notifications

```bash
# Test task completion notification
terminal-notifier -title "Claude Code" -subtitle "Task Complete" -message "Test notification" -sound Glass

# Test attention notification
terminal-notifier -title "Claude Code" -subtitle "Needs Attention" -message "Test notification" -sound Basso
```

### Expected Behavior

**When Mac is active:**
- Notification appears in top-right corner of Mac
- Notification appears on iPhone if it's locked
- Notification sound plays on Mac

**When Mac is idle/locked:**
- Notification appears on both Mac and iPhone lock screens
- Notification badge appears on iPhone
- Can be dismissed from either device

**iOS 26 Continuity Features:**
- Notifications use the new Liquid Glass design on iPhone
- Dismissing on one device dismisses on all devices
- Smart routing based on device activity
- Apple Watch support (if you have one paired)

## iOS 26-Specific Features

### Enhanced Notification Sync

iOS 26 introduces improved notification continuity:

1. **Liquid Glass Integration**: Notifications on iPhone use the new iOS 26 Liquid Glass design language
2. **Smart Device Selection**: iOS 26 intelligently routes notifications to the device you're actively using
3. **Cross-Device Dismissal**: Dismiss once, dismissed everywhere
4. **Focus Mode Integration**: Respects Focus modes across all devices
5. **Live Activities Support**: For longer-running tasks (requires macOS Tahoe 26+)

### Managing Notification Delivery

**Priority Settings:**
```
iOS 26: Settings → Notifications → Terminal
→ Immediate Delivery (for instant notifications)
→ Time Sensitive (bypasses Focus modes)
```

**Focus Mode Configuration:**
```
iOS 26: Settings → Focus → [Your Focus Mode]
→ Allow Notifications From: Terminal
```

## Optional: Enhanced iPhone Push Notifications

If you want more persistent iPhone notifications that work even when your Mac is active, use Pushover.

### Why Pushover?

- Notifications persist on iPhone even when Mac is in use
- More reliable cross-device delivery
- Notification history
- Custom sounds and priority levels
- $5 one-time purchase (no subscription)

### Setup Pushover

1. **Sign up at pushover.net** ($5 one-time fee)

2. **Get your credentials:**
   - **User Key**: Found on your account dashboard
   - **API Token**: Create a new application, copy the token

3. **Set environment variables:**

   Edit `~/.zshrc` (or `~/.bash_profile` if using bash):
   ```bash
   export PUSHOVER_APP_TOKEN="your_app_token_here"
   export PUSHOVER_USER_KEY="your_user_key_here"
   ```

   Then reload:
   ```bash
   source ~/.zshrc
   ```

4. **Create notification script:**

   ```bash
   # Create bin directory if it doesn't exist
   mkdir -p ~/bin

   # Create the script
   nano ~/bin/notify_claude.sh
   ```

   Add this content:

   ```bash
   #!/bin/bash

   MESSAGE="${1:-Claude Code notification}"
   SOUND="${2:-default}"

   # Send to Mac (always)
   terminal-notifier -title "Claude Code" -message "$MESSAGE" -sound "$SOUND" -group "claude-code"

   # Also send to iPhone via Pushover (if configured)
   if [ -n "$PUSHOVER_APP_TOKEN" ] && [ -n "$PUSHOVER_USER_KEY" ]; then
       curl -s \
         --form-string "token=$PUSHOVER_APP_TOKEN" \
         --form-string "user=$PUSHOVER_USER_KEY" \
         --form-string "title=Claude Code" \
         --form-string "message=$MESSAGE" \
         --form-string "sound=pushover" \
         --form-string "priority=0" \
         https://api.pushover.net/1/messages.json > /dev/null
   fi
   ```

   Make it executable:
   ```bash
   chmod +x ~/bin/notify_claude.sh
   ```

5. **Update Claude Code settings** (`~/.claude/settings.json`):

   ```json
   {
     "hooks": {
       "Stop": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "~/bin/notify_claude.sh 'Task complete!' 'Glass'"
             }
           ]
         }
       ],
       "Notification": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "~/bin/notify_claude.sh 'Claude needs your attention' 'Basso'"
             }
           ]
         }
       ]
     }
   }
   ```

6. **Install Pushover app** on your iPhone from the App Store

7. **Test the setup:**
   ```bash
   ~/bin/notify_claude.sh "Test from Pushover!" "Glass"
   ```

### Pushover Priority Levels

You can customize notification priority in the curl command:

- `priority=-2`: Silent notification (no sound/vibration)
- `priority=-1`: Quiet notification (no sound)
- `priority=0`: Normal priority (default)
- `priority=1`: High priority (bypasses quiet hours)
- `priority=2`: Emergency (requires acknowledgment)

## Troubleshooting

### Notifications Not Appearing on iPhone

1. **Verify Handoff is enabled:**
   ```bash
   # On Mac - check Handoff status
   defaults read ~/Library/Preferences/com.apple.coreservices.useractivityd.plist
   ```

2. **Check Bluetooth connection:**
   - Ensure Bluetooth is ON on both devices
   - Devices should be within 30 feet of each other
   - Try turning Bluetooth off and on again

3. **Check Focus modes:**
   - iOS 26: Settings → Focus
   - Ensure Focus mode isn't blocking Terminal notifications
   - Configure "Allow Notifications From" to include Terminal

4. **Verify notification settings:**
   - iOS 26: Settings → Notifications → (look for mirrored Mac notifications)
   - Ensure "Show Previews" is not set to "Never"

5. **Restart notification services:**
   ```bash
   # On Mac
   killall NotificationCenter
   killall usernoted
   ```

6. **Re-pair devices:**
   - Turn off Bluetooth on both devices
   - Wait 10 seconds
   - Turn Bluetooth back on
   - Wait for devices to re-pair

### Notifications Not Appearing on Mac

1. **Check Do Not Disturb:**
   ```
   System Settings → Focus
   → Ensure Focus mode allows Terminal notifications
   ```

2. **Verify Terminal notification permissions:**
   ```
   System Settings → Notifications → Terminal
   ✓ Allow notifications
   → Alert style: Alerts or Banners
   ```

3. **Test terminal-notifier directly:**
   ```bash
   terminal-notifier -title "Test" -message "Direct test" -sound default
   ```

   If this doesn't work, terminal-notifier may need reinstalling:
   ```bash
   brew reinstall terminal-notifier
   ```

### Claude Code Hooks Not Firing

1. **Verify settings file exists:**
   ```bash
   cat ~/.claude/settings.json
   ```

2. **Check JSON syntax:**
   ```bash
   # Validate JSON
   python3 -m json.tool ~/.claude/settings.json
   ```

3. **Test hooks manually:**
   ```bash
   # Run the command directly
   terminal-notifier -title "Claude Code" -subtitle "Test" -message "Manual test" -sound Glass
   ```

4. **Check Claude Code logs:**
   - Look for hook execution errors in Claude Code output

### Pushover Issues

1. **Test API credentials:**
   ```bash
   curl -s \
     --form-string "token=$PUSHOVER_APP_TOKEN" \
     --form-string "user=$PUSHOVER_USER_KEY" \
     --form-string "message=Test message" \
     https://api.pushover.net/1/messages.json
   ```

   Should return: `{"status":1, ...}`

2. **Verify environment variables are set:**
   ```bash
   echo $PUSHOVER_APP_TOKEN
   echo $PUSHOVER_USER_KEY
   ```

3. **Check script permissions:**
   ```bash
   ls -la ~/bin/notify_claude.sh
   # Should show: -rwxr-xr-x (executable)
   ```

## Advanced Configuration

### Context-Aware Notifications

Only notify when terminal is not in focus:

```bash
#!/bin/bash
# ~/bin/notify_claude_smart.sh

MESSAGE="${1:-Claude Code notification}"
SOUND="${2:-default}"

# Check if terminal is focused
FRONTMOST=$(osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true')

if [ "$FRONTMOST" != "Terminal" ] && [ "$FRONTMOST" != "iTerm2" ]; then
    terminal-notifier -title "Claude Code" -message "$MESSAGE" -sound "$SOUND"

    # Also send to Pushover if configured
    if [ -n "$PUSHOVER_APP_TOKEN" ] && [ -n "$PUSHOVER_USER_KEY" ]; then
        curl -s \
          --form-string "token=$PUSHOVER_APP_TOKEN" \
          --form-string "user=$PUSHOVER_USER_KEY" \
          --form-string "title=Claude Code" \
          --form-string "message=$MESSAGE" \
          https://api.pushover.net/1/messages.json > /dev/null
    fi
fi
```

### Custom Notification Sounds

Download additional notification sounds:

1. Find .aiff or .caf sound files
2. Place in: `~/Library/Sounds/`
3. Use filename (without extension) in `-sound` parameter

### Notification Grouping

Group related notifications:

```bash
terminal-notifier \
  -title "Claude Code" \
  -message "Your message" \
  -group "claude-code-tasks" \
  -sender "com.apple.Terminal"
```

### Actionable Notifications

Add buttons to notifications:

```bash
terminal-notifier \
  -title "Claude Code" \
  -message "Task complete. Open project?" \
  -actions "Open,Dismiss" \
  -sound Glass
```

## Best Practices

1. **Use distinctive sounds** for different event types
2. **Keep messages concise** - they appear on lock screens
3. **Test on both devices** after making changes
4. **Use notification grouping** to avoid clutter
5. **Configure Focus modes** to allow important notifications
6. **Monitor notification permissions** after OS updates

## Additional Resources

- [Apple Continuity Documentation](https://support.apple.com/en-us/HT204681)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude/docs/claude-code)
- [terminal-notifier GitHub](https://github.com/julienXX/terminal-notifier)
- [Pushover API Documentation](https://pushover.net/api)
- [iOS 26 Features](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/)

## Changelog

- **2025-10-15**: Initial documentation for iOS 26 and macOS Sequoia 15.7.1
  - Added Liquid Glass design integration notes
  - Updated for iOS 26 notification continuity features
  - Added Pushover setup for enhanced iPhone notifications
