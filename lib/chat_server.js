// chat_server.js
//
function assignGuestName( socket, guestNumber, nickNames, namesUsed ) {
  var name = 'Guest' + guestNumber;

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

  var usersRoom = io.sockets.client( room );

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

