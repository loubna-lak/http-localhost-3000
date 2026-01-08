const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const xmlModel = require('./models/xmlModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    xmlModel.getGroups((groups) => socket.emit('initGroups', groups));

    socket.on('createGroup', (data) => {
        xmlModel.saveGroup(data.name, data.admin);
        xmlModel.getGroups((groups) => io.emit('initGroups', groups));
    });

    socket.on('deleteGroup', (data) => {
        xmlModel.deleteGroup(data.name, data.admin, () => {
            xmlModel.getGroups((groups) => io.emit('initGroups', groups));
        });
    });

    socket.on('requestJoin', (data) => {
        xmlModel.addRequest(data.group, data.user, () => {
            xmlModel.getGroups((groups) => io.emit('initGroups', groups));
        });
    });

    socket.on('approveUser', (data) => {
        xmlModel.approveMember(data.group, data.user, () => {
            xmlModel.getGroups((groups) => io.emit('initGroups', groups));
            io.emit('userApproved', { group: data.group, user: data.user.toLowerCase().trim() });
        });
    });

    socket.on('joinGroup', (data) => {
        socket.join(data.group);
        xmlModel.getMessages((allMsgs) => {
            const history = allMsgs.filter(m => m.group === data.group);
            socket.emit('loadHistory', history);
        });
    });

    socket.on('chatMessage', (data) => {
        xmlModel.saveMessage(data);
        io.to(data.group).emit('message', data);
    });
});

server.listen(3000, () => console.log('Server is running on http://localhost:3000'));