const bull = require('bull');
import dbClient from './utils/db';
const imageThumbnail = require('image-thumbnail');


const fileQueue = new bull('fileQueue')


function processQueue(job) {
    fileQueue.process(async (job) => {
        if (!job.data.fileId){
            throw new Error('Missing fileId')
        }
        if (!job.data.userId){
            throw new Error('Missing userId')
        }
        const files = dbClient.db.collection('files')
        const file =  await files.findOne({ _id: job.data.fileId, userId: job.data.userId})
        if (!file){
            throw new Error('File not found')
        }
        const thumbnail1 = await imageThumbnail('image.png', { width: 500, });
        const thumbnail2 = await imageThumbnail('image.png', { width: 250, });
        const thumbnail3 = await imageThumbnail('image.png', { width: 100, });
    
    
        console.log(job.data.foo)
        return doSomething(job.data);
      });
    
}

  module.exports = processQueue;
