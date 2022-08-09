const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const directoryPath = path.join(__dirname, 'uploads');
const options = {
    cert : fs.readFileSync('certificate.crt'),
    ca: fs.readFileSync('ca_bundle.crt'),
    key: fs.readFileSync('private.key')
}
const http = require('https').createServer(options, app).listen(3000);
const io = require('socket.io')(http, {
    cors: {
        origin: "*"
    },
    maxHttpBufferSize: 5e+7
})

io.on('connection', socket => {
    socket.on('upload', data => {
        fs.writeFile(`${directoryPath}/[${data.code}]${data.fileName}`, data.file, (err) => {

            try {
                console.log(`[${data.code}]${data.fileName} has been uploaded.`)
                socket.emit('upload.status', "Complete")
            } catch (e) {
                console.log(e);
                socket.emit('upload.status', "Error")
            }
        })
    })
    socket.on('getFilesByName', code => {
        try {
            const files = [];
            fs.readdirSync(__dirname + '/uploads', { withFileTypes: true })
                .map(item => {
                    if (item.name.slice(1, 16) === code) {
                        files.push(item.name.slice(17, item.name.length))
                    }
                    socket.emit('file', files)
                })
        } catch(e) {
            console.log(e)
            e.code === "ENOENT" && socket.emit('file', '404')
        }
    })
})

function updateJson(fileName, code) {
    fs.readFile(__dirname + '/data.json', (err, data) => {
        try {
            let files = JSON.parse(data);
            if (files[code]) {
                files[code].push(fileName)
            } else {
                files[code] = [fileName];
            }
            const newFile = JSON.stringify(files);
            fs.writeFile(__dirname + '/data.json', newFile, err => {
                if (err) throw err;
            })
        } catch (e) {
            console.log(e);
        }
    });
}

app.get('/download/file/:fileName', (req, res) => {
    const { fileName } = req.params;
    res.download(`${__dirname}/uploads/${fileName}`);
})