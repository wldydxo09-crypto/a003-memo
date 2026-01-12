import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI 환경변수를 설정해주세요');
}

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
    // Development: use global variable to prevent multiple connections
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // Production: create a new connection
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;

// Helper function to get database
export async function getDatabase(dbName?: string): Promise<Db> {
    const client = await clientPromise;
    return client.db(dbName);
}
