const mongo = require('mongodb');
import { types } from 'mime-types';
import { uuid } from 'uuidv4';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
const fs = require('fs');
const mime = require('mime-types')
const bull = require('bull');
import processQueue from '../worker';

class FilesController{
    static async postUpload(request, response){        
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userId = await redisClient.get(key)
        if (!userId){
            return response.status(401).send('error: Unauthorized1')
        }
      
        const name = request.body.name
        const type = request.body.type
        const parentId = request.body.parentId || 0
        const isPublic = request.body.isPublic || false
        const data = request.body.data
        const acceptedTypes = ['folder', 'file', 'image']
        const files = dbClient.db.collection('files')
        if (!name){
            return response.status(400).send({"error": "Missing name"})
        }
        if (!type || !acceptedTypes.includes(type)){
            return response.status(400).send({"error": "Missing type"})
        }
        if (!data && type != 'folder'){
            return response.status(400).send({"error": "Missing data"})
        }


        if (parentId != 0){
            const file = await files.findOne({'_id': parentId})
            if (!file){
                return response.status(400).send({"error": "Parent not found"})
            }
            if (file.type != 'folder'){
                return response.status(400).send({"error": "Parent is not a folder"})
            }
        }
        if (type === 'folder'){
            const newFile = await files.insertOne({'userId': userId, 'name': name, 'type': type, 'isPublic': isPublic, 'parentId': parentId})
            return response.status(201).send({
                "id": newFile.insertedId,
                "userId": newFile.ops[0].userId,
                "name": newFile.ops[0].name,
                "type": newFile.ops[0].type,
                "isPublic":newFile.ops[0].isPublic,
                "parentId": newFile.ops[0].parentId,
            })
        }


        const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager'
        if (!fs.existsSync(FOLDER_PATH)) {
            fs.mkdirSync(FOLDER_PATH);
          }
        const localPath = `${FOLDER_PATH}/${uuid()}`
        const decode = Buffer.from(data, 'base64').toString('utf-8');
        await fs.promises.writeFile(localPath, decode);
        const newFile = await files.insertOne({'userId': userId, 'name': name, 'type': type, 'isPublic': isPublic, 'parentId': parentId, 'localPath': localPath})
        console.log(newFile.ops[0].name)
        console.log(newFile)


        if (type === 'image'){
            const fileQueue = bull.Queue('fileQueue')
            const job = fileQueue.add({
                fileId: newFile.insertedId,
                userId: newFile.ops[0].userId
            })
            processQueue(job)

        }
    
        return response.status(201).send({
            "id": newFile.insertedId,
            "userId": newFile.ops[0].userId,
            "name": newFile.ops[0].name,
            "type": newFile.ops[0].type,
            "isPublic":newFile.ops[0].isPublic,
            "parentId": newFile.ops[0].parentId,
        })


    }
    static async getShow(request, response){
        //retrieve user based on token
        
        const token = request.headers['x-token']
        const key = `auth_${token}`
        console.log('key: '+key)
        const userId = await redisClient.get(key)
        console.log('userId: ' + userId)
        if (!userId){
            return response.status(401).send('error: Unauthorized1')
        }

        const id = request.params.id
        console.log('id:'+ id)
        const collection = dbClient.db.collection('files')
        const file =  await collection.findOne({_id: new mongo.ObjectID(id) })
        console.log('file'+file)
        if (!file){
            return response.status(404).send('error: Not found')

        }
        return response.status(200).send({
            "id": file._id,
            "userId": file.userId,
            "name": file.name,
            "type": file.type,
            "isPublic":file.isPublic,
            "parentId": file.parentId,
        })
    }
    static async getIndex(request, response){
        
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userId = await redisClient.get(key)
        
        if (!userId){
            return response.status(401).send('error: Unauthorized1')
        }
        const parentId = request.query.parentId || 0

    }


    static async putPublish(request, response){
        
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userId = await redisClient.get(key)
        if (!userId){
            return response.status(401).send('error: Unauthorized1')
        }
        const id = request.params.id
        const collection = dbClient.db.collection('files')
        const file =  await collection.findOne({_id: new mongo.ObjectID(id) })
        if (!file){
            return response.status(404).send('error: Not found')

        }
        file.isPublic = true
        return response.status(200).send({
            "id": file._id,
            "userId": file.userId,
            "name": file.name,
            "type": file.type,
            "isPublic":file.isPublic,
            "parentId": file.parentId,
        })

    }
    static async putUnpublish(request, response){
        
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userId = await redisClient.get(key)
        if (!userId){
            return response.status(401).send('error: Unauthorized1')
        }
        const id = request.params.id
        const collection = dbClient.db.collection('files')
        const file =  await collection.findOne({_id: new mongo.ObjectID(id) })
        if (!file){
            return response.status(404).send('error: Not found')

        }
        file.isPublic = false
        return response.status(200).send({
            "id": file._id,
            "userId": file.userId,
            "name": file.name,
            "type": file.type,
            "isPublic":file.isPublic,
            "parentId": file.parentId,
        })
    }

    static async getFile(request, response){       
        const token = request.headers['x-token']
        const key = `auth_${token}`
        const userId = await redisClient.get(key)
        if (!userId){
            return response.status(401).send({"error": "Not found"})
        }
        const id = request.params.id
        console.log('id:'+ id)
        const collection = dbClient.db.collection('files')
        const file =  await collection.findOne({_id: new mongo.ObjectID(id) })
        if (!file){
            return response.status(404).send({"error": "Not found"})

        }

        if (file.isPublic === false && userId != file.userId.toString()){
            return response.status(404).send({"error": "Not found"})
        }
        if (file.type === 'folder'){
            return response.status(400).send({"error": "A folder doesn't have content"})
        }
        if (!fs.existsSync(file.localPath)){
            return response.status(404).send({"error": "Not found"})
        }
        return response.status(200).send(fs.readFileSync(file.localPath))

    }

}

module.exports = FilesController;
