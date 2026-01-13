const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrateData() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const historyCollection = db.collection('history');

        // 1. Identify Target User (The one currently logged in on Vercel)
        // I saw this ID in your logs: 6965a79d6042c81edb5e0671
        const targetUserId = "6965a79d6042c81edb5e0671";

        // 2. Identify Source User (The one with the data)
        // We find the user who has the most history items (should be around 39)
        const userCounts = await historyCollection.aggregate([
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]).toArray();

        if (userCounts.length === 0) {
            console.log("No history data found to migrate.");
            return;
        }

        const sourceUser = userCounts[0];
        const sourceUserId = sourceUser._id;
        const sourceCount = sourceUser.count;

        if (sourceUserId === targetUserId) {
            console.log(`Data is already owned by the target user ${targetUserId}. No migration needed.`);
            return;
        }

        console.log(`Found Source User: ${sourceUserId} (Items: ${sourceCount})`);
        console.log(`Target User: ${targetUserId}`);

        // 3. Perform Migration
        const result = await historyCollection.updateMany(
            { userId: sourceUserId },
            { $set: { userId: targetUserId } }
        );

        console.log(`\nMigration Complete!`);
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
        console.log(`\nNow refresh your Vercel site. You should see ${sourceCount} items!`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

migrateData();
