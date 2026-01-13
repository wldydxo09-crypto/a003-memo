const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrateSettings() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const settingsCollection = db.collection('user_settings');

        const oldUserId = "696452ae01251ca9866c4d5e";
        const newUserId = "6965a79d6042c81edb5e0671";

        // Update the userId directly
        const result = await settingsCollection.updateOne(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );

        console.log(`\nSettings Migration Complete!`);
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
        console.log(`\nNow refresh your Vercel site. Sidebar should be back!`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

migrateSettings();
