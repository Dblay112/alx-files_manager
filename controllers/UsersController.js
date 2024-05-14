import dbClient from '../utils/db';
import redisClient from '../utils/redis';
const mongo = require('mongodb');
const sha1 = require('sha1');


class UsersController{
    static async postNew(request, response){
        //await dbClient.db.collection('users').remove()
        if(!request.body.email){
            return response.status(400).send({"error": "Missing email"})
        }
        if(!request.body.password){
            return response.status(400).send({"error": "Missing password"})
        }
        if(await dbClient.db.collection('users').findOne({email: request.body.email})){
            return response.status(400).send({"error": "Already exist"})
        }
        const newUser = await dbClient.db.collection('users').insertOne({email: request.body.email, password: sha1(request.body.password)})
        console.log({ "id": newUser.insertedId, "email": request.body.email})
        return response.status(201).send({"id": newUser.insertedId, "email": request.body.email})
    }

    static getMe(request, response) {
        const token = request.headers['x-token']
        const key = `auth_${token}`
        console.log('key: '+key)
        let userId;
        redisClient.get(key).then((result) => {
            if (!result){
                return response.status(401).send('error: Unauthorized')
            }
            userId = result
        })
        dbClient.db.collection('users').findOne({userId}, (err, result) => {
            if (!result){
                return response.status(401).send('error: Unauthorized')
            }
            return response.status(200).send({id:userId,email:result.email})
        })

    }
}

module.exports = UsersController
