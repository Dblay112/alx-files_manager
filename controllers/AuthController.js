import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import sha1 from 'sha1';

class AuthController {
    static async getConnect(req, res) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Basic ')) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const authInfo = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf-8');
        const [email, password] = authInfo.split(':');

        if (!email || !password) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await dbClient.client.db().collection('users').findOne({ email, password: sha1(password) });

        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const token = uuidv4();
        await redisClient.set(`auth_${token}`, user._id.toString(), 86400);
        res.status(200).json({ token });
    }

    static async getDisconnect(req, res) {
        const { 'x-token': token } = req.headers;

        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const userId = await redisClient.get(`auth_${token}`);

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        await redisClient.del(`auth_${token}`);
        res.status(204).send();
    }
}

export default AuthController;
