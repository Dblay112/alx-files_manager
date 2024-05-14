import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import sha1 from 'sha1';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Missing email' });
            return;
        }

        if (!password) {
            res.status(400).json({ error: 'Missing password' });
            return;
        }

        const usersCollection = dbClient.client.db().collection('users');
        const user = await usersCollection.findOne({ email });

        if (user) {
            res.status(400).json({ error: 'Already exist' });
            return;
        }

        const newUser = {
            email,
            password: sha1(password)
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({ id: result.insertedId, email });
    }
}

export default UsersController;
