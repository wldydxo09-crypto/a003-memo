import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;

// Options for better reliability in serverless environments
const options = {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    console.error("[MongoDB] MONGODB_URI is missing in environment variables!");
    throw new Error('MONGODB_URI 환경변수를 설정해주세요');
} else {
    // Print a sanitized URI for debugging (hides password)
    const sanitizedUri = process.env.MONGODB_URI.replace(/:([^@]+)@/, ":****@");
    console.log(`[MongoDB] Connecting with URI: ${sanitizedUri}`);
}

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect().catch(err => {
            console.error("[MongoDB] Connection error:", err);
            throw err;
        });
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect().catch(err => {
        console.error("[MongoDB/Prod] Connection error:", err);
        throw err;
    });
}

export default clientPromise;

// Helper function to get database
export async function getDatabase(dbName?: string): Promise<Db> {
    const client = await clientPromise;
    return client.db(dbName);
}
