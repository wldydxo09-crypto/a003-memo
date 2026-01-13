const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Please set MONGODB_URI in .env.local');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(); // Uses the DB from URI (smartwork)

        console.log(`Connected to database: ${db.databaseName}`);

        const historyCollection = db.collection('history');

        // Find all distinct userIds in history
        const userIdsInHistory = await historyCollection.distinct('userId');

        console.log('\n--- History Data Owners ---');
        for (const userId of userIdsInHistory) {
            const count = await historyCollection.countDocuments({ userId });
            console.log(`User ID: ${userId} | History Items: ${count}`);
        }

        // List all users in 'users' collection
        const usersCollection = db.collection('users');
        const allUsers = await usersCollection.find({}).toArray();

        console.log('\n--- Registered Users (Auth) ---');
        allUsers.forEach(u => {
            console.log(`User ID: ${u._id} | Email: ${u.email} | Name: ${u.name}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkUsers();
