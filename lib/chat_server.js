// chat_server.js
//

var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

function assignGuestName( socket, guestNumber, nickNames, namesUsed ) {
  var name = 'Guest' + guestNumber;

	console.log('name> ' + name);
  console.log('socket.id> ' + socket.id);
  nickNames[socket.id] = name;

  socket.emit('nameResult', {
	success: true,
	name: name
  });

  namesUsed.push(name);

  return guestNumber + 1;
}

function joinRoom( socket, room ) {
  socket.join(room);

  currentRoom[ socket.id ] = room;

  socket.emit( 'joinResult', {room: room});

  // ルームにいる他のユーザに、このユーザが入室したことを知らせる
  socket.broadcast.to(room).emit('message', {
	text: nickNames[ socket.id ] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients( room );

  if (usersInRoom.length > 1) {
	var usersInRoomSummary = 'Users currently in ' + room + ': ';
	for (var index in usersInRoom) {
	  var userSocketId = usersInRoom[index].id;
	  if (userSocketId != socket.id) {
		if (index > 0) {
		  usersInRoomSummary += ', ';
		}
		usersInRoomSummary += nickNames[ userSocketId ];
	  }
	}
	usersInRoomSummary += '.';
	socket.emit('message', {text: usersInRoomSummary});
  }
}

// 名前変更を試みる要求を処理
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function(name) {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      if (namesUsed.indexOf(name) == -1) {
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        // 他のクライアントが使えるように、以前の名前を登録削除する
        delete namesUsed[previousNameIndex];

        socket.emit('nameResult', {
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        });
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'  // その名前はもう使われています。
        });
      }
    }
  });
}

// メッセージの転送
function handleMessageBroadcasting( socket ) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[ socket.id ] + ': ' + message.text
    });
  });
}

// ルームの作成
function handleRoomJoining( socket ) {
  socket.on('join', function( room ) {
    socket.leave( currentRoom[socket.id]);
    joinRoom( socket, room.newRoom);
  });
}

// ゆーざのニックネームを削除する
function handleClientDisconnection( socket ) {
  socket.on( 'disconnect', function () {
    var nameIndex = namesUsed.indexOf( nickNames[ socket.id]);
    delete namesUsed[ nameIndex ];
    delete nickNames[ socket.id ];
  });
}


exports.listen = function( server ) {
  io = socketio.listen(server); // Socket.IOサーバを始動し、既存のHTTPサーバに相乗りさせる
  io.set('log level', 1);

  io.sockets.on( 'connection', function (socket) {
	
	// ユーザの接続時にゲスト名を割り当てる
	guestNumber = assignGuestName( socket, guestNumber, nickNames, namesUsed );

	// 接続したユーザを Lobby に入れる
	joinRoom( socket, 'Lobby' );

	// ユーザのメッセージ、名前変更とルーム作成／変更の要求を処理する
	handleMessageBroadcasting( socket, nickNames );

	handleNameChangeAttempts( socket, nickNames, namesUsed );

	handleRoomJoining( socket );

	// ユーザの要求に応じて、使用されているルームのリストを提供
	socket.on( 'rooms', function() {
	  socket.emit( 'rooms', io.sockets.manager.rooms );
	});

	// ユーザが接続を断ったときのためにクリーンアップロジックを定義する
	handleClientDisconnection( socket, nickNames, namesUsed );
  });
};
