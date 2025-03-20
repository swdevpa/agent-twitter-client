# AI Photo Editor - Twitter Marketing Agent

This module provides an automated Twitter marketing solution for the AI Photo Editor app, designed to implement the marketing strategy defined in the project documentation.

## Features

- **Content-Based Tweeting**: Creates and posts tweets based on different content pillars:
  - Product Updates (15%)
  - Tutorial Content (25%)
  - AI Generation Showcases (20%) 
  - AI Editing Showcases (20%)
  - Industry Content (10%)
  - Community Engagement (10%)

- **Day-Based Scheduling**: Automatically selects the appropriate content type based on the day of the week:
  - Monday: Product Updates
  - Tuesday: Tutorial Content
  - Wednesday: AI Generation Showcases
  - Thursday: AI Editing Showcases
  - Friday: Industry Content
  - Saturday: Community Engagement
  - Sunday: Mix of high-performing content types

- **Optimal Posting Times**: Schedules tweets at the best times for engagement:
  - Morning: 8-10am
  - Lunchtime: 12-1pm
  - Evening: 5-7pm

- **Hashtag Strategy**: Automatically includes relevant hashtags for each content type:
  - Primary hashtags on all posts
  - Content-specific secondary hashtags
  - Optimal hashtag count for better engagement

- **Performance Analysis**: Analyze the performance of your tweets to optimize future posts

## Setup

1. Ensure you have Node.js installed (v14 or later recommended)
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   TWITTER_USERNAME=your_twitter_username
   TWITTER_PASSWORD=your_twitter_password
   TWITTER_EMAIL=your_email@example.com
   ```

## Usage

The marketing tools can be used in several ways:

### Command Line Interface (CLI)

A flexible CLI is available for direct control of the marketing features:

```bash
# Show help
npm run marketing

# Post a tweet (uses day-based content type)
npm run marketing:post

# Post a specific content type
npm run marketing:post tutorial
npm run marketing:post product
npm run marketing:post generation
npm run marketing:post editing
npm run marketing:post industry
npm run marketing:post community

# View current Twitter trends
npm run marketing:trends
npm run marketing:trends 10  # Show top 10 trends

# Analyze tweet performance
npm run marketing:analyze
npm run marketing:analyze 20  # Analyze last 20 tweets
```

### Scheduled Posting

For automated posting according to the marketing schedule:

```bash
# Start the scheduler (posts at configured times)
npm run marketing:schedule

# Start the scheduler AND post immediately
npm run marketing:schedule:now
```

### Configuration

The scheduler settings can be modified in the `scheduler-config.json` file:

```json
{
  "enabled": true,
  "tweetsPerDay": 2,
  "scheduledTimes": [
    [8, 30],  // 8:30 AM
    [17, 30]  // 5:30 PM
  ],
  "lastRun": "2023-06-15T08:30:00.000Z",
  "logging": true
}
```

The file is automatically created on first run and can be edited to change the posting schedule.

## Core Files

- `MarketingAgent.js` - The main agent class with all marketing functionality
- `marketingCLI.js` - Command-line interface for using the marketing features
- `scheduledMarketing.js` - Automated scheduler for posting at optimal times

## Features in Detail

### Content Creation

The agent creates varied, engaging content following these templates:

- **Product Updates**: Announcements about new features, bug fixes, version releases
- **Tutorial Content**: Tips for using AI features, prompt engineering guides, how-to content
- **AI Generation Showcases**: Examples of images created with the app, with prompts
- **AI Editing Showcases**: Before/after transformations showcasing editing capabilities
- **Industry Content**: AI image generation trends, news, and industry insights
- **Community Engagement**: Challenges, polls, questions, and user spotlights

### Authentication

The agent handles Twitter authentication automatically:
- Securely stores and reuses cookies to maintain login sessions
- Falls back to password login if cookies expire
- Creates cookie backups to prevent login issues

### Analytics

Tracks the performance of your marketing campaign:
- Monitors engagement by content type
- Identifies best-performing tweets
- Helps optimize your content strategy

## Security Notes

- Your Twitter credentials are stored in the `.env` file and are never shared
- Cookie data is securely stored locally
- Always review the code before running on production accounts

## Troubleshooting

If you encounter issues:

1. Check your `.env` file has the correct credentials
2. Ensure you have a stable internet connection
3. Look for errors in the console output
4. If cookie login fails, try removing the cookies.json file and letting the agent create fresh cookies

For persistent problems, check Twitter's API status or review any recent changes to Twitter's service that might affect the client. 