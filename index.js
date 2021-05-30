const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


var active_users = {};
var active_users_names = [];

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/pages/index.html');
});

io.on('connection', (socket)=>{
    console.log('a user connected');

    var name = "Player "+socket.id;
    active_users_names.push(name);
    active_users[name] = socket;
    socket.data.user_name = name;

    io.emit('users', active_users_names);

    socket.on('chat message', (msg)=>{
        console.log('message: ' + msg);
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
      });

    socket.on('disconnect', ()=>{
        console.log('a user disconnected');
        var index = 0;
        for( const i in active_users_names){
            if(socket.data.user_name == active_users_names[i]){

                active_users_names.splice(index,1);
                io.emit('users', active_users_names);
                break;
            }
            index += 1;

        };

    });

    socket.on('mouse', (data)=>{
        io.emit('mouse',data);        
    });

});

server.listen(4000, ()=>{
    console.log('listening on *:4000');
});