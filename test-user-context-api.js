/**
 * Simple test script for user-context API endpoint
 * Run with: node test-user-context-api.js YOUR_USERNAME
 */

const http = require('http');

const username = process.argv[2];

if (!username) {
  console.error('❌ Please provide a username as an argument');
  console.log('Usage: node test-user-context-api.js YOUR_USERNAME');
  process.exit(1);
}

const url = `http://localhost:3000/api/user-context?username=${encodeURIComponent(username)}`;

console.log(`\n🧪 Testing User Context API`);
console.log(`📡 URL: ${url}\n`);

const req = http.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Status Code: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        
        console.log('✅ Response Data:');
        console.log(JSON.stringify(json, null, 2));
        console.log('\n');

        // Validate response structure
        console.log('🔍 Validation:');
        
        if (json.recentGames) {
          console.log(`  ✅ Recent Games: ${json.recentGames.length} games`);
          console.log(`     ${json.recentGames.join(', ')}`);
        } else {
          console.log('  ⚠️  No recent games');
        }

        if (json.topGenres) {
          console.log(`  ✅ Top Genres: ${json.topGenres.length} genres`);
          console.log(`     ${json.topGenres.join(', ')}`);
        } else {
          console.log('  ⚠️  No top genres');
        }

        if (json.activity) {
          console.log(`  ✅ Activity Data:`);
          console.log(`     Last Question: ${json.activity.lastQuestionTime || 'N/A'}`);
          console.log(`     Questions Today: ${json.activity.questionsToday || 0}`);
          console.log(`     Questions This Week: ${json.activity.questionsThisWeek || 0}`);
          if (json.activity.peakActivityHours) {
            console.log(`     Peak Hours: ${json.activity.peakActivityHours.join(', ')}`);
          }
        } else {
          console.log('  ⚠️  No activity data');
        }

        if (json.questionPatterns) {
          console.log(`  ✅ Question Patterns:`);
          if (json.questionPatterns.commonCategories) {
            console.log(`     Categories: ${json.questionPatterns.commonCategories.join(', ')}`);
          }
          if (json.questionPatterns.recentQuestionTypes) {
            console.log(`     Types: ${json.questionPatterns.recentQuestionTypes.join(', ')}`);
          }
        } else {
          console.log('  ⚠️  No question patterns');
        }

        if (json.preferences) {
          console.log(`  ✅ User Preferences: Available`);
        } else {
          console.log('  ⚠️  No user preferences');
        }

        console.log('\n✅ Test completed successfully!\n');
      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message);
        console.log('Raw response:', data);
      }
    } else {
      console.error(`❌ Error: ${res.statusCode}`);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request Error: ${error.message}`);
  console.log('\n💡 Make sure the development server is running:');
  console.log('   npm run dev\n');
});

req.setTimeout(5000, () => {
  req.destroy();
  console.error('❌ Request timeout (5s)');
  console.log('💡 Make sure the server is running and accessible\n');
});

