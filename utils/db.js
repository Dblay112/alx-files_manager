import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        const url = `mongodb://${host}:${port}`;

        this.client = new MongoClient(url, { useUnifiedTopology: true });

        this.client.connect((err) => {
            if (err) {
                console.error('DB connection error:', err);
            } else {
                console.log('DB connected successfully');
            }
        });
    }

    isAlive() {
        return this.client.isConnected();
    }

    async nbUsers() {
        const db = this.client.db(process.env.DB_DATABASE || 'files_manager');
        const collection = db.collection('users');
        return collection.countDocuments();
    }

    async nbFiles() {
        const db = this.client.db(process.env.DB_DATABASE || 'files_manager');
        const collection = db.collection('files');
        return collection.countDocuments();
    }
}

const dbClient = new DBClient();
export default dbClient;
