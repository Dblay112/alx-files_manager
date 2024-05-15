import { del } from 'request';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
const { uuid } = require('uuidv4');
const sha1 = require('sha1');
const mongo = require("mongodb")

class AuthController{
    static async getConnect(request, response){
        const collection = dbClient.db.collection('users')
        const auth = request.get('authorization').split(' ')[1]
        const step1 = Buffer.from(auth, 'base64').toString('utf8');
        const step2 = step1.split(':') //result - [email, password]

        const email = step2[0]
        const password = step2[1]
        const user = await collection.findOne({email: email, password: sha1(password)})
        if (!user){
            return response.status(401).send({'error': 'Unauthorized'})
        }
        const token = uuid()
        const key = `auth_${token}`
        await redisClient.set(key, user._id, 24 * 3600)
        return response.status(200).send({ "token": token })
    

    }
    static async getDisconnect(request, response){
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userID = await redisClient.get(key)
        if (!userID){
            return response.status(401).send('error: Unauthorized1')
        }
        redisClient.del(key)
        response.status(204).send()

    }

}

module.exports = AuthController
