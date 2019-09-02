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
