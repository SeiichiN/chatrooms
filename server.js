// server.js
//
var http = require('http');  // httpのサーバー・クライアント機能を提供
var fs = require('fs');      // ファイルシステム
var path = require('path');  // パスに関する機能
var mime = require('mime');  // 拡張子にもとづいて、MIMEタイプを推論

// ファイルの内容を保存
var cache = {};

// 要求されたファイルが存在しない場合
function send404( response ) {
  response.writeHead( 404, {'Content-Type': 'text/plain'} );
  response.write('Error 404: resource not found.');
  response.end();
}

// 要求されたファイルを送信する
function sendFile( response, filePath, fileContents ) {
  response.writeHead(
	200,
	{"content-type": mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

// キャッシュがあればそれを返す
// なければファイルを読んでそれを返す
// それもなければ、404エラーを返す
function serveStatic( response, cache, absPath ) {
  if (cache[ absPath ]) {
	sendFile( response, absPath, cache[absPath]);
  } else {
	fs.exists( absPath, function (exists) {
	  if (exists) {
		fs.readFile( absPath, function (err, data) {
		  if (err) {
			send404( response );
		  } else {
			cache[ absPath ] = data;
			sendFile( response, absPath, data );
		  }
		});
	  } else {
		send404( response );
	  }
	});
  }
}

// HTTPサーバを作る（無名関数で個々の要求に対する振る舞いを定義する）
//
var server = http.createServer( function( request, response ) {
  var filePath = false;
  if ( request.url === '/' ) {
	filePath = 'public/index.html';
  } else {
	filePath = 'public' + request.url;
  }
  var absPath = './' + filePath;
  serveStatic( response, cache, absPath );
});

server.listen( 3000, function() {
  console.log("Server listening on port 3000.");
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);

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
