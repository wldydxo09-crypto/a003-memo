const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkSettings() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();
        const settingsCollection = db.collection('user_settings');

        const oldUserId = "696452ae01251ca9866c4d5e";
        const newUserId = "6965a79d6042c81edb5e0671";

        const oldSettings = await settingsCollection.findOne({ userId: oldUserId });
        const newSettings = await settingsCollection.findOne({ userId: newUserId });

        console.log('--- Old User Settings ---');
        console.log(oldSettings ? JSON.stringify(oldSettings, null, 2) : 'Not found');

        console.log('\n--- New User Settings ---');
        console.log(newSettings ? JSON.stringify(newSettings, null, 2) : 'Not found');

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkSettings();
