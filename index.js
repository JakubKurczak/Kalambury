const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const session = require('express-session');
const { Server } = require("socket.io");
const io = new Server(server);
const sessionMiddleware = session({secret: 'secret',saveUninitialized: true, resave: true})

var active_users = {};
var active_users_names = [];
var active_rooms = [];
var players_in_rooms = {};

app.use(sessionMiddleware); //idk why we have to put this data but its mandatory
app.use(bodyParser.json());

io.use((socket, next)=>{
    sessionMiddleware(socket.request, {}, next);
});

app.get('/game', (req, res)=>{
    res.sendFile(__dirname + '/pages/index.html');
});

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/pages/start_page.html');
});

app.post('/make_game',(req,res)=>{
    var roomName = req.body.room_name;
    var playerName = req.body.player_name;
    if((active_users_names.indexOf(playerName) > -1 )|| (active_rooms.indexOf(roomName) > -1)){
        res.sendStatus(409); //status for resource already exists
    }else{
        req.session.player_name = playerName;
        req.session.room_name = roomName;
        active_rooms.push(roomName);
        active_users_names.push(playerName);

        players_in_rooms[roomName] = [];
        players_in_rooms[roomName].push(playerName);
        console.log("created room: " + roomName);
        res.sendStatus(200);
    }    
});

app.post('/join_game',(req,res)=>{
    var roomName = req.body.room_name;
    var playerName = req.body.player_name;
    if(active_users_names.indexOf(playerName) > -1){
        res.sendStatus(409); //status for resource already exists
    }else if (active_rooms.indexOf(roomName) > -1){
        req.session.player_name = playerName;
        req.session.room_name = roomName;

        players_in_rooms[roomName].push(playerName);
        active_users_names.push(playerName);

        res.sendStatus(200);
    }else{
        res.sendStatus(404); //there is no room you requested
    }
    
});

io.on('connection', (socket)=>{
    console.log('a user connected');

    var name = socket.request.session.player_name;
    socket.join(socket.request.session.room_name);

    active_users[name] = socket;
    socket.data.user_name = name;
    console.log(name + " joined room " + socket.request.session.room_name);

    io.to(socket.request.session.room_name).emit('users',players_in_rooms[socket.request.session.room_name]);

    io.to(socket.request.session.room_name).emit('room_name',socket.request.session.room_name);
    socket.on('chat message', (msg) => {
        io.to(socket.request.session.room_name).emit('chat message', msg);
      });

    
    socket.on('disconnect', ()=>{
        console.log('a user disconnected');
        var index = 0;
        for( const i in active_users_names){
            if(socket.data.user_name == active_users_names[i]){

                active_users_names.splice(index,1);
                break;
            }
            index += 1;

        };
        index = 0;
        for(const i in players_in_rooms[socket.request.session.room_name]){
            if(players_in_rooms[socket.request.session.room_name][i] == socket.data.user_name){
                players_in_rooms[socket.request.session.room_name].splice(index, 1);
                io.to(socket.request.session.room_name).emit('users',players_in_rooms[socket.request.session.room_name]);
                break;
            }
            index += 1;
        }
        console.log("player " + socket.request.session.player_name+" removed");
        if(players_in_rooms[socket.request.session.room_name].length == 0){
            for(const i in active_rooms){
                if(active_rooms[i] == socket.request.session.room_name){
                    active_rooms.splice(i,1);
                    console.log("room " + socket.request.session.room_name+" removed");
                    break;
                }
            }
        }
    });

    socket.on('mouse', (data)=>{
        io.to(socket.request.session.room_name).emit('mouse',data);        
    });

});

server.listen(4000, ()=>{
    console.log('listening on *:4000');
});